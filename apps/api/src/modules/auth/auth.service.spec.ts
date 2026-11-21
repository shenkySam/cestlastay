import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { OAuthVerifierService } from './oauth-verifier.service';
import { GuestOtpService } from './guest-otp.service';
import { PrismaService } from '../../prisma/prisma.service';

const ACCESS_SECRET = 'a'.repeat(40);
const REFRESH_SECRET = 'r'.repeat(40);

type Row = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
};

/** In-memory stand-in for the two Prisma models refresh rotation touches. */
function fakePrisma() {
  const rows: Row[] = [];
  const users = new Map<string, { id: string; email: string; role: string; status: string }>();
  let seq = 0;
  const matches = (r: Row, where: Partial<Row>) =>
    Object.entries(where).every(([k, v]) => (r as Record<string, unknown>)[k] === v);

  const prisma = {
    refreshToken: {
      create: jest.fn(async ({ data }: { data: Omit<Row, 'id' | 'revokedAt' | 'replacedById'> }) => {
        const row: Row = { id: `rt${++seq}`, revokedAt: null, replacedById: null, ...data };
        rows.push(row);
        return { id: row.id };
      }),
      findUnique: jest.fn(async ({ where }: { where: { tokenHash: string } }) =>
        rows.find((r) => r.tokenHash === where.tokenHash) ?? null,
      ),
      updateMany: jest.fn(async ({ where, data }: { where: Partial<Row>; data: Partial<Row> }) => {
        const hit = rows.filter((r) => matches(r, where));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      }),
    },
    user: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null),
    },
  };
  return { prisma, rows, users };
}

function setup() {
  const { prisma, rows, users } = fakePrisma();
  users.set('u1', { id: 'u1', email: 'staff@hotel.com', role: 'STAFF', status: 'ACTIVE' });
  const config = new ConfigService({
    JWT_SECRET: ACCESS_SECRET,
    JWT_REFRESH_SECRET: REFRESH_SECRET,
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  });
  const jwt = new JwtService({ secret: ACCESS_SECRET });
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt,
    config,
    {} as OAuthVerifierService,
    {} as GuestOtpService,
  );
  // signTokens is private; it's the same path oauthLogin uses after verifying.
  type SignTokens = (
    id: string,
    email: string,
    role: string,
  ) => Promise<{ accessToken: string; refreshToken: string }>;
  const issue = () =>
    (service as unknown as { signTokens: SignTokens }).signTokens('u1', 'staff@hotel.com', 'STAFF');
  return { service, jwt, rows, users, issue };
}

describe('AuthService.refreshTokens', () => {
  afterEach(() => jest.useRealTimers());

  it('rotates: returns a new pair and revokes the presented token', async () => {
    const { service, rows, issue } = setup();
    const first = await issue();

    const next = await service.refreshTokens(first.refreshToken);

    expect(next.refreshToken).not.toBe(first.refreshToken);
    expect(rows).toHaveLength(2);
    expect(rows[0].revokedAt).toBeInstanceOf(Date);
    expect(rows[0].replacedById).toBe(rows[1].id);
    expect(rows[1].revokedAt).toBeNull();
    expect(next).not.toHaveProperty('refreshTokenId');
  });

  it('signs with the role currently in the database, not the old token', async () => {
    const { service, jwt, users, issue } = setup();
    const first = await issue();
    users.set('u1', { id: 'u1', email: 'staff@hotel.com', role: 'ADMIN', status: 'ACTIVE' });

    const next = await service.refreshTokens(first.refreshToken);

    expect(jwt.decode(next.accessToken)).toMatchObject({ role: 'ADMIN', typ: 'access' });
  });

  it('allows a second refresh with the same token inside the grace window (two tabs)', async () => {
    const { service, rows, issue } = setup();
    const first = await issue();
    await service.refreshTokens(first.refreshToken);

    await expect(service.refreshTokens(first.refreshToken)).resolves.toHaveProperty('accessToken');
    expect(rows.filter((r) => !r.revokedAt)).toHaveLength(2);
  });

  it('treats a replay after the grace window as theft and revokes every token', async () => {
    const { service, rows, issue } = setup();
    const first = await issue();
    await service.refreshTokens(first.refreshToken);
    rows[0].revokedAt = new Date(Date.now() - 60_000);

    await expect(service.refreshTokens(first.refreshToken)).rejects.toThrow(UnauthorizedException);
    expect(rows.every((r) => r.revokedAt)).toBe(true);
  });

  it('rejects an access token presented as a refresh token', async () => {
    const { service, issue } = setup();
    const { accessToken } = await issue();
    await expect(service.refreshTokens(accessToken)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a refresh token missing typ/jti (issued before rotation existed)', async () => {
    const { service, jwt } = setup();
    const legacy = jwt.sign(
      { sub: 'u1', email: 'staff@hotel.com', role: 'STAFF' },
      { secret: REFRESH_SECRET, expiresIn: '7d' },
    );
    await expect(service.refreshTokens(legacy)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects and revokes when the user is no longer active', async () => {
    const { service, rows, users, issue } = setup();
    const first = await issue();
    users.set('u1', { id: 'u1', email: 'staff@hotel.com', role: 'STAFF', status: 'SUSPENDED' });

    await expect(service.refreshTokens(first.refreshToken)).rejects.toThrow(UnauthorizedException);
    expect(rows[0].revokedAt).toBeInstanceOf(Date);
  });

  it('logout revokes the token so it can no longer refresh', async () => {
    const { service, rows, issue } = setup();
    const first = await issue();

    await service.logout(first.refreshToken);
    rows[0].revokedAt = new Date(Date.now() - 60_000); // past the grace window

    await expect(service.refreshTokens(first.refreshToken)).rejects.toThrow(UnauthorizedException);
  });

  it('logout ignores garbage', async () => {
    const { service } = setup();
    await expect(service.logout('not-a-jwt')).resolves.toBeUndefined();
    await expect(service.logout(undefined)).resolves.toBeUndefined();
  });
});
