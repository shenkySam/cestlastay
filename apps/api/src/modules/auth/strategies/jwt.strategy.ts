import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { cachePrincipal, getCachedPrincipal, principalVersion } from '../principal-cache';

export interface JwtPayload {
  sub: string;
  email?: string;
  role: string;
  bookingId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Guest tokens carry sub = guestId (guests table), not a userId, and are
    // scoped to one booking. Load that booking (with its guest) and return a
    // guest-shaped principal; bookingStatus gates pre-arrival actions.
    if (payload.role === 'GUEST') {
      if (!payload.bookingId) throw new UnauthorizedException();
      const booking = await this.prisma.booking.findUnique({
        where: { id: payload.bookingId },
        select: {
          guestId: true,
          status: true,
          guest: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });
      if (!booking || booking.guestId !== payload.sub) throw new UnauthorizedException();
      return {
        id: booking.guest.id,
        role: 'GUEST',
        guest: booking.guest,
        bookingId: payload.bookingId,
        bookingStatus: booking.status,
      };
    }

    const cached = getCachedPrincipal(payload.sub);
    if (cached) return cached;
    const version = principalVersion(payload.sub);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        staff: { select: { id: true, employeeId: true } },
        guest: { select: { id: true } },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }

    cachePrincipal(user.id, user, version);
    return user;
  }
}
