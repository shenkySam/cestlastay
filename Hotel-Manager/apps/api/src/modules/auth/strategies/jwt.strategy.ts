import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email?: string;
  role: string;
  bookingId?: string;
}

/** Parse one cookie from the raw Cookie header without cookie-parser. */
function extractCookieFromRequest(req: Request, name: string): string | null {
  const header = req?.headers?.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key.trim() === name) return rest.join('=').trim();
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => extractCookieFromRequest(req, 'access_token'),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
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
