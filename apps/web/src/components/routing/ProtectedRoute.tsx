import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserRole } from '@shared/index';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_HOME } from '@/lib/roleHome';

interface Props {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!user) {
    // Open the sign-in page on the matching side of the Guest / Staff switch
    const as = pathname.startsWith('/guest') ? 'guest' : 'staff';
    return <Navigate to={`/login?as=${as}`} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  return <>{children}</>;
}
