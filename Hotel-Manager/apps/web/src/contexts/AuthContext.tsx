import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { IUser, UserRole, UserStatus } from '@shared/index';
import api from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';

interface AuthUser extends Omit<IUser, 'createdAt' | 'updatedAt' | 'emailVerified' | 'lastLoginAt'> {
  staff?: { id: string; employeeId: string; department: string; position: string } | null;
  guest?: { id: string; loyaltyPoints: number } | null;
  // Extended for guest portal -- carries the active booking ID
  bookingId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** @deprecated Tokens are now HttpOnly cookies. This is always null. */
  accessToken: null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  guestLogin: (bookingNumber: string, lastName: string) => Promise<void>;
  logout: () => void;
  isRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    // Ask the server to clear the HttpOnly auth cookies
    try { await api.post('/auth/logout'); } catch { /* ignore -- clear locally regardless */ }
    localStorage.removeItem('isGuest');
    localStorage.removeItem('guestUser');
    setUser(null);
    disconnectSocket();
    window.location.href = isGuest ? '/guest-portal' : '/login';
  }, []);

  // Boot: restore session.
  // Tokens are in HttpOnly cookies -- we never read them in JS.
  useEffect(() => {
    const isGuest = localStorage.getItem('isGuest') === 'true';

    if (isGuest) {
      // Guest tokens have sub=guestId so GET /auth/me returns nothing useful.
      // The serialised user object (no credentials) is kept in localStorage for restoration.
      const stored = localStorage.getItem('guestUser');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          logout();
        }
      } else {
        logout();
      }
      setLoading(false);
      return;
    }

    // For regular users the cookie is enough -- just call /auth/me to hydrate the user object.
    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => {
        // No valid session cookie -> stay on login page but don't force a redirect here
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [logout]);

  // Listen for forced logout (e.g. both tokens expired / server rejected refresh)
  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const login = async (email: string, password: string) => {
    // Server sets HttpOnly cookies; response body contains only the user object
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
  };

  const guestLogin = async (bookingNumber: string, lastName: string) => {
    // Server sets a 24 h HttpOnly access cookie; response body contains the booking
    const { data } = await api.post('/auth/guest-portal', { bookingNumber, lastName });

    const guestUser: AuthUser = {
      id: data.booking.guest.id ?? '',
      email: data.booking.guest.email ?? '',
      firstName: data.booking.guest.firstName,
      lastName: data.booking.guest.lastName,
      role: UserRole.GUEST,
      status: UserStatus.ACTIVE,
      emailVerified: false,
      guest: { id: data.booking.guest.id, loyaltyPoints: 0 },
      staff: null,
      bookingId: data.booking.id,
    };

    // Persist the user object (no credentials) so the session survives a page refresh
    localStorage.setItem('isGuest', 'true');
    localStorage.setItem('guestUser', JSON.stringify(guestUser));
    setUser(guestUser);
  };

  const isRole = (...roles: UserRole[]) => !!user && roles.includes(user.role);

  return (
    <AuthContext.Provider value={{ user, accessToken: null, loading, login, guestLogin, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
