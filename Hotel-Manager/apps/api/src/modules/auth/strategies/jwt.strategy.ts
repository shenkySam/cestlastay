import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

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
    // Guest portal tokens carry sub = guestId (guests table), not a userId.
    // Look them up against the guests table and return a guest-shaped principal.
    if (payload.role === 'GUEST') {
      if (!payload.bookingId) throw new UnauthorizedException();
      const guest = await this.prisma.guest.findUnique({
        where: { id: payload.sub },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      if (!guest) throw new UnauthorizedException();
      return {
        id: guest.id,
        role: 'GUEST',
        guest,
        bookingId: payload.bookingId,
      };
    }

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

    return user;
  }
}
