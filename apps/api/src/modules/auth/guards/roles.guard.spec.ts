import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@hms/shared';
import { RolesGuard } from './roles.guard';

const ctx = (user: unknown) =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

function guardRequiring(roles: UserRole[] | undefined) {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(roles) } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('allows any authenticated user when no @Roles is set', () => {
    expect(guardRequiring(undefined).canActivate(ctx({ role: UserRole.GUEST }))).toBe(true);
  });

  it('allows a listed role', () => {
    const guard = guardRequiring([UserRole.ADMIN, UserRole.STAFF]);
    expect(guard.canActivate(ctx({ role: UserRole.STAFF }))).toBe(true);
  });

  it('rejects a guest token on a staff route', () => {
    const guard = guardRequiring([UserRole.ADMIN, UserRole.STAFF]);
    expect(() => guard.canActivate(ctx({ role: UserRole.GUEST }))).toThrow(ForbiddenException);
  });

  it('rejects when there is no user on the request', () => {
    const guard = guardRequiring([UserRole.ADMIN]);
    expect(() => guard.canActivate(ctx(undefined))).toThrow(ForbiddenException);
  });
});
