import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Guests may sign in to a booking that is still PENDING (awaiting staff
 * confirmation) so they can see it, but nothing they do may change state until
 * it is confirmed. Runs after JwtAuthGuard, so `request.user` is populated for
 * every non-public route.
 */
@Injectable()
export class PendingStayGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user as { role?: string; bookingStatus?: string } | undefined;
    if (
      user?.role === 'GUEST' &&
      user.bookingStatus === 'PENDING' &&
      !READ_METHODS.has(String(request.method).toUpperCase())
    ) {
      throw new ForbiddenException(
        'Your booking is awaiting confirmation. This opens once our team confirms your stay.',
      );
    }
    return true;
  }
}
