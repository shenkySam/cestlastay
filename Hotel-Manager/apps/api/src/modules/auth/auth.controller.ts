import {
  Controller, Post, Get, Body, Req, Res,
  UseGuards, HttpCode, HttpStatus, UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GuestPortalDto } from './dto/guest-portal.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

/** Shared options for all auth cookies. */
const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  // secure: true in production (HTTPS). The env-check below handles this.
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

const ACCESS_COOKIE_OPTS  = { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 };           // 15 min
const REFRESH_COOKIE_OPTS = { ...COOKIE_BASE, maxAge: 7 * 24 * 60 * 60 * 1000 };  // 7 days
const GUEST_COOKIE_OPTS   = { ...COOKIE_BASE, maxAge: 24 * 60 * 60 * 1000 };      // 24 h

/** Read one cookie value from the raw Cookie header without cookie-parser. */
function parseCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key.trim() === name) return rest.join('=').trim() || null;
  }
  return null;
}

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.login(dto);
    res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTS);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTS);
    // Return only the user -- tokens travel via Set-Cookie, never in the JSON body
    return { user };
  }

  @Public()
  @Post('guest-portal')
  @HttpCode(HttpStatus.OK)
  async guestPortal(
    @Body() dto: GuestPortalDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, booking } = await this.authService.guestPortalAccess(dto);
    res.cookie('access_token', accessToken, GUEST_COOKIE_OPTS);
    // No refresh token for guests -- the 24 h portal token is the session
    return { booking };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = parseCookie(req, 'refresh_token');
    if (!refreshToken) throw new UnauthorizedException('No refresh token cookie');
    const { accessToken, refreshToken: newRefresh } = await this.authService.refreshTokens(refreshToken);
    res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTS);
    res.cookie('refresh_token', newRefresh, REFRESH_COOKIE_OPTS);
    return { message: 'Token refreshed' };
  }

  @Get('me')
  getMe(@CurrentUser() user: { id: string }) {
    return this.authService.getMe(user.id);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { ...COOKIE_BASE, maxAge: 0 });
    res.clearCookie('refresh_token', { ...COOKIE_BASE, maxAge: 0 });
  }
}
