import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
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
    const tokens = this.signTokens(user.id, user.email, user.role);
    return { user: safeUser, ...tokens };
  }

  async guestPortalAccess(dto: GuestPortalDto) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        bookingNumber: dto.bookingNumber,
        guest: { lastName: { equals: dto.lastName, mode: 'insensitive' } },
        // Portal access only while the guest is actually staying (checked in)
        status: 'CHECKED_IN',
      },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, email: true } },
        rooms: {
          include: {
            room: { select: { roomNumber: true, category: { select: { name: true } } } },
          },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found or not checked in yet');

    // Issue a short-lived guest portal token
    const token = this.jwt.sign(
      { sub: booking.guestId, bookingId: booking.id, role: 'GUEST' },
      { expiresIn: '24h', secret: this.config.get('JWT_SECRET') },
    );

    return { accessToken: token, booking };
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

  private signTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      secret: this.config.get('JWT_SECRET'),
    });
    const refreshToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      secret: this.config.get('JWT_REFRESH_SECRET'),
    });
    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const tokens = this.signTokens(payload.sub, payload.email, payload.role);
      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
