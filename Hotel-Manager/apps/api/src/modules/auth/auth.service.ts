import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@hms/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GuestPortalDto } from './dto/guest-portal.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.GUEST,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    const tokens = this.signTokens(user.id, user.email, user.role);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        staff: { select: { id: true, employeeId: true } },
        guest: { select: { id: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { passwordHash: _, ...safeUser } = user;
    const tokens = this.signTokens(user.id, user.email, user.role);
    return { user: safeUser, ...tokens };
  }

  async guestPortalAccess(dto: GuestPortalDto) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        bookingNumber: dto.bookingNumber,
        guest: { lastName: { equals: dto.lastName, mode: 'insensitive' } },
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, email: true } },
        room: { select: { roomNumber: true, category: { select: { name: true } } } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found or not active');

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
