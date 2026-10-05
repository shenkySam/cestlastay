import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SkipThrottle, Throttle, ThrottlerGuard, hours, minutes } from '@nestjs/throttler';
import { UserRole } from '@hms/shared';
import { AuthService } from './auth.service';
import { OAuthLoginDto } from './dto/oauth-login.dto';
import { GuestPortalDto } from './dto/guest-portal.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';

// Per-IP sign-in limits (throttlers are defined in auth.module.ts). Only the
// routes below carry ThrottlerGuard; the rest of the API is not throttled.
const OAUTH_LIMIT = { minute: { limit: 10, ttl: minutes(1) } };
const SKIP_HOURLY = { hour: true };

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Staff sign-in is Google / Apple only — there is no email + password login.
  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(OAUTH_LIMIT)
  @SkipThrottle(SKIP_HOURLY)
  googleLogin(@Body() dto: OAuthLoginDto) {
    return this.authService.oauthLogin('google', dto.idToken);
  }

  @Public()
  @Post('apple')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(OAUTH_LIMIT)
  @SkipThrottle(SKIP_HOURLY)
  appleLogin(@Body() dto: OAuthLoginDto) {
    return this.authService.oauthLogin('apple', dto.idToken);
  }

  // Booking numbers are sequential (BKG-YYYYMMDD-NNNN), so this is the
  // brute-force target — hence the tighter per-minute and hourly caps.
  @Public()
  @Post('guest-portal')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ minute: { limit: 5, ttl: minutes(1) }, hour: { limit: 20, ttl: hours(1) } })
  guestPortal(@Body() dto: GuestPortalDto) {
    return this.authService.guestPortalAccess(dto);
  }

  /** Guest sign-in with Google, matched to a booking by the verified email. */
  @Public()
  @Post('guest/google')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(OAUTH_LIMIT)
  @SkipThrottle(SKIP_HOURLY)
  guestGoogleLogin(@Body() dto: OAuthLoginDto) {
    return this.authService.guestGoogleLogin(dto.idToken);
  }

  /** Current booking for a guest token (status changes, e.g. after check-in). */
  @Get('guest/me')
  @Roles(UserRole.GUEST)
  guestMe(@CurrentUser() user: { bookingId: string }) {
    return this.authService.guestSession(user.bookingId);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ minute: { limit: 30, ttl: minutes(1) } })
  @SkipThrottle(SKIP_HOURLY)
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  @Get('me')
  getMe(@CurrentUser() user: { id: string }) {
    return this.authService.getMe(user.id);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout() {
    // JWT is stateless; client discards the token
    return;
  }
}
