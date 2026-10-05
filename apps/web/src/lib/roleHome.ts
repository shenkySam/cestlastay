import { UserRole } from '@shared/index';

/** Where each role lands after signing in (and when it opens a route it can't use). */
export const ROLE_HOME: Record<UserRole, string> = {
  [UserRole.ADMIN]: '/admin',
  [UserRole.STAFF]: '/staff',
  [UserRole.GUEST]: '/guest/home',
};
