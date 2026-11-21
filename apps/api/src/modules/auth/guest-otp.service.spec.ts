import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../crm/email.service';
import {
  GuestOtpService,
  HANDOFF_TTL_MS,
  OTP_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
} from './guest-otp.service';
import { pickGuestStay } from './auth.service';

type Row = {
  id: string;
  email: string;
  codeHash: string;
  bookingId: string | null;
  purpose: 'OTP' | 'HANDOFF';
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

/** Just enough of Prisma's where-clause semantics for GuestOtpService. */
function matches(r: Row, where: Record<string, any>): boolean {
  return Object.entries(where).every(([k, v]) => {
    const actual = (r as any)[k];
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('gt' in v) return actual > v.gt;
      if ('lt' in v) return actual < v.lt;
    }
    if (v instanceof Date) return actual?.getTime() === v.getTime();
    return actual === v;
  });
}

function setup() {
  const rows: Row[] = [];
  let seq = 0;
  const prisma = {
    guestLoginCode: {
      findFirst: jest.fn(async ({ where }: any) =>
        [...rows].reverse().find((r) => matches(r, where)) ?? null,
      ),
      create: jest.fn(async ({ data }: any) => {
        const row: Row = {
          id: `c${++seq}`,
          bookingId: null,
          attempts: 0,
          consumedAt: null,
          createdAt: new Date(),
          ...data,
        };
        rows.push(row);
        return row;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const hit = rows.filter((r) => matches(r, where));
        for (const r of hit) {
          for (const [k, v] of Object.entries<any>(data)) {
            (r as any)[k] = v && typeof v === 'object' && 'increment' in v ? (r as any)[k] + v.increment : v;
          }
        }
        return { count: hit.length };
      }),
    },
  };
  const sent: { to: string; devNote?: string; html: string; logBody?: string }[] = [];
  const email = { send: jest.fn(async (p: any) => sent.push(p)) };
  const service = new GuestOtpService(
    prisma as unknown as PrismaService,
    email as unknown as EmailService,
    new ConfigService({ JWT_SECRET: 's'.repeat(40) }),
  );
  const lastCode = () => sent[sent.length - 1].devNote!.replace('code ', '');
  return { service, rows, sent, lastCode };
}

describe('GuestOtpService', () => {
  afterEach(() => jest.useRealTimers());

  it('emails a code that signs in once, case-insensitively by email', async () => {
    const { service, rows, sent, lastCode } = setup();
    await service.sendOtp('Guest@Example.com', { bookingId: 'b1' });
    expect(sent).toHaveLength(1);
    expect(rows[0].email).toBe('guest@example.com');
    // The code is in the email but never stored or logged in clear.
    expect(rows[0].codeHash).not.toContain(lastCode());
    expect(sent[0].logBody).not.toContain(lastCode());

    const ok = await service.verifyOtp('guest@example.COM', lastCode());
    expect(ok?.bookingId).toBe('b1');
    expect(await service.verifyOtp('guest@example.com', lastCode())).toBeNull();
  });

  it('rejects a wrong code and burns it after the attempt cap', async () => {
    const { service, lastCode } = setup();
    await service.sendOtp('g@x.com');
    const right = lastCode();
    const wrong = right === '000000' ? '111111' : '000000';
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
      expect(await service.verifyOtp('g@x.com', wrong)).toBeNull();
    }
    expect(await service.verifyOtp('g@x.com', right)).toBeNull();
  });

  it('expires codes', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-21T10:00:00Z') });
    const { service, lastCode } = setup();
    await service.sendOtp('g@x.com');
    jest.setSystemTime(Date.now() + OTP_TTL_MS + 1);
    expect(await service.verifyOtp('g@x.com', lastCode())).toBeNull();
  });

  it('holds back resends during the cooldown, and a resend retires the old code', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-21T10:00:00Z') });
    const { service, sent, lastCode } = setup();
    await service.sendOtp('g@x.com');
    const first = lastCode();
    expect(await service.sendOtp('g@x.com')).toBe(false);
    expect(sent).toHaveLength(1);

    jest.setSystemTime(Date.now() + OTP_COOLDOWN_MS + 1);
    expect(await service.sendOtp('g@x.com')).toBe(true);
    if (first !== lastCode()) {
      expect(await service.verifyOtp('g@x.com', first)).toBeNull();
    }
    expect(await service.verifyOtp('g@x.com', lastCode())).not.toBeNull();
  });

  it('handoff codes are single-use and short-lived', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-21T10:00:00Z') });
    const { service } = setup();
    const code = await service.createHandoff('b1', 'g@x.com');
    expect(await service.consumeHandoff(code)).toBe('b1');
    expect(await service.consumeHandoff(code)).toBeNull();

    const late = await service.createHandoff('b1', 'g@x.com');
    jest.setSystemTime(Date.now() + HANDOFF_TTL_MS + 1);
    expect(await service.consumeHandoff(late)).toBeNull();
    expect(await service.consumeHandoff('not-a-code')).toBeNull();
  });
});

describe('pickGuestStay', () => {
  it('prefers the stay in progress, then confirmed, then pending', () => {
    const b = (id: string, status: string) => ({ id, status });
    expect(pickGuestStay([b('p', 'PENDING'), b('c', 'CONFIRMED'), b('i', 'CHECKED_IN')])?.id).toBe('i');
    expect(pickGuestStay([b('p', 'PENDING'), b('c', 'CONFIRMED')])?.id).toBe('c');
    expect(pickGuestStay([b('p', 'PENDING')])?.id).toBe('p');
    expect(pickGuestStay([])).toBeUndefined();
  });
});
