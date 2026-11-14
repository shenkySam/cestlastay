import { createHash, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { startOfToday } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { SYSTEM_USER_EMAIL } from '../../common/system-user';
import { GuestPortalDto } from './dto/guest-portal.dto';
import { OAuthProvider, OAuthVerifierService } from './oauth-verifier.service';

const PROVIDER_LABEL: Record<OAuthProvider, string> = { google: 'Google', apple: 'Apple' };

const LOGIN_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  googleId: true,
  appleId: true,
  staff: { select: { id: true, employeeId: true } },
  guest: { select: { id: true } },
} as const;

/** Booking fields the guest pages render (summary, rooms, dates, status). */
const GUEST_BOOKING_INCLUDE = {
  guest: { select: { id: true, firstName: true, lastName: true, email: true } },
  rooms: {
    include: {
      room: { select: { roomNumber: true, category: { select: { name: true } } } },
    },
  },
} satisfies Prisma.BookingInclude;

type GuestBooking = Prisma.BookingGetPayload<{ include: typeof GUEST_BOOKING_INCLUDE }>;

/**
 * Bookings a guest may sign in to: the stay in progress, or a confirmed one
 * that hasn't ended yet (so the guest can see it before arrival).
 */
const activeStay = (): Prisma.BookingWhereInput => ({
  OR: [
    { status: 'CHECKED_IN' },
    { status: 'CONFIRMED', checkOutDate: { gte: startOfToday() } },
  ],
});

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly oauth: OAuthVerifierService,
  ) {}

  /**
   * Sign in with a Google / Apple ID token. There is no self-signup: the user
   * must already exist (an admin adds them by email). The first sign-in with a
   * provider links its stable subject ID to the account by verified email;
   * later sign-ins match on that ID.
   */
  async oauthLogin(provider: OAuthProvider, idToken: string) {
    const identity = await this.oauth.verify(provider, idToken);
    const label = PROVIDER_LABEL[provider];
    const bySubject = provider === 'google'
      ? { googleId: identity.subject }
      : { appleId: identity.subject };

    let user = await this.prisma.user.findUnique({ where: bySubject, select: LOGIN_USER_SELECT });

    if (!user) {
      if (!identity.email || !identity.emailVerified) {
        throw new UnauthorizedException(`Your ${label} account has no verified email address`);
      }
      if (identity.email.endsWith('@privaterelay.appleid.com')) {
        throw new UnauthorizedException(
          "Apple hid your email, so we can't match it to your account. In your Apple ID settings, " +
            "stop using Sign in with Apple for C'est La Stay, then sign in again and choose \"Share My Email\".",
        );
      }

      user = await this.prisma.user.findFirst({
        where: { email: { equals: identity.email, mode: 'insensitive' } },
        select: LOGIN_USER_SELECT,
      });
      if (!user) {
        throw new UnauthorizedException(
          `No account found for ${identity.email}. Ask an administrator to add you.`,
        );
      }
      // Same email, but already linked to a different Google / Apple account
      const linkedId = provider === 'google' ? user.googleId : user.appleId;
      if (linkedId && linkedId !== identity.subject) {
        throw new UnauthorizedException(
          `This account is linked to a different ${label} account. Ask an administrator for help.`,
        );
      }
    }

    if (user.status !== 'ACTIVE' || user.email.toLowerCase() === SYSTEM_USER_EMAIL) {
      throw new UnauthorizedException('Account is not active');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { ...bySubject, emailVerified: true, lastLoginAt: new Date() },
    });

    const { googleId: _g, appleId: _a, ...safeUser } = user;
    const { refreshTokenId: _id, ...tokens } = await this.signTokens(user.id, user.email, user.role);
    return { user: safeUser, ...tokens };
  }

  async guestPortalAccess(dto: GuestPortalDto) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        bookingNumber: dto.bookingNumber,
        guest: { lastName: { equals: dto.lastName, mode: 'insensitive' } },
        ...activeStay(),
      },
      include: GUEST_BOOKING_INCLUDE,
    });

    if (!booking) {
      throw new NotFoundException(
        'No current or upcoming stay found for that booking number and last name',
      );
    }

    return this.issueGuestSession(booking);
  }

  /**
   * Guest sign-in with Google: the verified Google email is matched against the
   * email on the booking. Guest emails aren't unique (repeat guests, staff
   * typos), so this matches bookings rather than guest records.
   */
  async guestGoogleLogin(idToken: string) {
    const identity = await this.oauth.verify('google', idToken);
    if (!identity.email || !identity.emailVerified) {
      throw new UnauthorizedException('Your Google account has no verified email address');
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        guest: { email: { equals: identity.email, mode: 'insensitive' } },
        ...activeStay(),
      },
      include: GUEST_BOOKING_INCLUDE,
      orderBy: { checkInDate: 'asc' },
    });

    // Prefer the stay in progress (latest check-in), else the next arrival
    const booking =
      bookings.filter((b) => b.status === 'CHECKED_IN').pop() ??
      bookings.find((b) => b.status === 'CONFIRMED');

    if (!booking) {
      throw new NotFoundException(
        `We couldn't find a current or upcoming stay booked under ${identity.email}. ` +
          'Try your booking number and last name.',
      );
    }

    return this.issueGuestSession(booking);
  }

  /** Fresh booking for a signed-in guest, so the portal picks up check-in etc. */
  async guestSession(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: GUEST_BOOKING_INCLUDE,
    });
    if (!booking) throw new UnauthorizedException();
    return { booking };
  }

  /** Short-lived guest token: sub = guestId (guests table), scoped to one booking. */
  private issueGuestSession(booking: GuestBooking) {
    const accessToken = this.jwt.sign(
      { sub: booking.guestId, bookingId: booking.id, role: 'GUEST', typ: 'access' },
      { expiresIn: '24h', secret: this.config.get('JWT_SECRET') },
    );
    return { accessToken, booking };
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        profileImageUrl: true,
        emailVerified: true,
        lastLoginAt: true,
        staff: { select: { id: true, employeeId: true, department: true, position: true } },
        guest: { select: { id: true, loyaltyPoints: true, loyaltyTier: true } },
        createdAt: true,
      },
    });
  }

  /**
   * Access token (stateless, short-lived) plus a refresh token that is tracked
   * in refresh_tokens by the sha256 of its jti, so it can be rotated and revoked.
   */
  private async signTokens(userId: string, email: string, role: string) {
    const accessToken = this.jwt.sign(
      { sub: userId, email, role, typ: 'access' },
      { expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'), secret: this.config.get('JWT_SECRET') },
    );
    const jti = randomUUID();
    const refreshToken = this.jwt.sign(
      { sub: userId, typ: 'refresh', jti },
      {
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        secret: this.config.get('JWT_REFRESH_SECRET'),
      },
    );
    const { exp } = this.jwt.decode(refreshToken) as { exp: number };
    const row = await this.prisma.refreshToken.create({
      data: { userId, tokenHash: hashJti(jti), expiresAt: new Date(exp * 1000) },
      select: { id: true },
    });
    return { accessToken, refreshToken, refreshTokenId: row.id };
  }

  /** Verified refresh-token payload, or null for anything else (incl. access tokens). */
  private verifyRefresh(token: unknown): { sub: string; jti: string } | null {
    if (typeof token !== 'string' || !token) return null;
    try {
      const payload = this.jwt.verify(token, { secret: this.config.get('JWT_REFRESH_SECRET') });
      if (payload?.typ !== 'refresh' || typeof payload.jti !== 'string') return null;
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Rotate a refresh token: the presented one is revoked and a new pair is
   * issued with the user's current role and email. Presenting a token that was
   * revoked longer ago than the grace window is treated as theft and revokes
   * every refresh token the user holds.
   */
  async refreshTokens(refreshToken: string) {
    const invalid = () => new UnauthorizedException('Invalid refresh token');
    const payload = this.verifyRefresh(refreshToken);
    if (!payload) throw invalid();

    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashJti(payload.jti) },
    });
    if (!row || row.userId !== payload.sub || row.expiresAt <= new Date()) throw invalid();

    if (row.revokedAt) {
      // Two tabs refreshing with the same token at once is normal (they share
      // localStorage); only a replay after the grace window counts as reuse.
      if (Date.now() - row.revokedAt.getTime() > ROTATION_GRACE_MS) {
        await this.revokeAllForUser(row.userId);
        throw invalid();
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: row.userId },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE' || user.email.toLowerCase() === SYSTEM_USER_EMAIL) {
      await this.revokeAllForUser(row.userId);
      throw invalid();
    }

    const tokens = await this.signTokens(user.id, user.email, user.role);
    if (!row.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { id: row.id, revokedAt: null },
        data: { revokedAt: new Date(), replacedById: tokens.refreshTokenId },
      });
    }
    const { refreshTokenId: _id, ...result } = tokens;
    return result;
  }

  /** Revoke the presented refresh token. Silent for unknown or invalid tokens. */
  async logout(refreshToken: unknown) {
    const payload = this.verifyRefresh(refreshToken);
    if (!payload) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashJti(payload.jti), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

/** A replay of a just-rotated token within this window is not treated as theft. */
const ROTATION_GRACE_MS = 30_000;

const hashJti = (jti: string) => createHash('sha256').update(jti).digest('hex');
