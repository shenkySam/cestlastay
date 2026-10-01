import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OAuthLoginDto } from './dto/oauth-login.dto';
import { GuestPortalDto } from './dto/guest-portal.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Sign-in is Google / Apple only — there is no email + password login.
  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  googleLogin(@Body() dto: OAuthLoginDto) {
    return this.authService.oauthLogin('google', dto.idToken);
  }

  @Public()
  @Post('apple')
  @HttpCode(HttpStatus.OK)
  appleLogin(@Body() dto: OAuthLoginDto) {
    return this.authService.oauthLogin('apple', dto.idToken);
  }

  @Public()
  @Post('guest-portal')
  @HttpCode(HttpStatus.OK)
  guestPortal(@Body() dto: GuestPortalDto) {
    return this.authService.guestPortalAccess(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
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
