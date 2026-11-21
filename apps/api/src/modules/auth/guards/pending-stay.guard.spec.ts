import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PendingStayGuard } from './pending-stay.guard';

const ctx = (method: string, user?: Record<string, unknown>) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ method, user }) }) }) as unknown as ExecutionContext;

describe('PendingStayGuard', () => {
  const guard = new PendingStayGuard();
  const pendingGuest = { role: 'GUEST', bookingStatus: 'PENDING' };

  it('lets a pending guest read', () => {
    expect(guard.canActivate(ctx('GET', pendingGuest))).toBe(true);
  });

  it('blocks a pending guest from changing anything', () => {
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      expect(() => guard.canActivate(ctx(method, pendingGuest))).toThrow(ForbiddenException);
    }
  });

  it('leaves confirmed guests, staff and public requests alone', () => {
    expect(guard.canActivate(ctx('POST', { role: 'GUEST', bookingStatus: 'CONFIRMED' }))).toBe(true);
    expect(guard.canActivate(ctx('POST', { role: 'STAFF' }))).toBe(true);
    expect(guard.canActivate(ctx('POST'))).toBe(true);
  });
});
