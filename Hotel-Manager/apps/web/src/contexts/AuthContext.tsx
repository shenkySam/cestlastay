import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { IUser, UserRole } from '@shared/index';
import api from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';

interface AuthUser extends Omit<IUser, 'createdAt' | 'updatedAt' | 'emailVerified' | 'lastLoginAt'> {
  staff?: { id: string; employeeId: string; department: string; position: string } | null;
  guest?: { id: string; loyaltyPoints: number } | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  guestLogin: (bookingNumber: string, lastName: string) => Promise<void>;
  logout: () => void;
  isRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem('accessToken'),
  );
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('isGuest');
    localStorage.removeItem('guestUser');
    setUser(null);
    setAccessToken(null);
    disconnectSocket();
    window.location.href = isGuest ? '/guest-portal' : '/login';
  }, []);

  // Boot: restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }

    const isGuest = localStorage.getItem('isGuest') === 'true';

    if (isGuest) {
      // Guest tokens have sub=guestId (not a userId) so GET /auth/me would 401.
      // We stored the guest user object in localStorage at login time — restore it.
      const stored = localStorage.getItem('guestUser');
      if (stored) {
        try { setUser(JSON.parse(stored)); setAccessToken(token); }
        catch { logout(); }
      } else {
        // No stored user data — can't restore session, send back to guest portal
        logout();
      }
      setLoading(false);
      return;
    }

    api.get('/auth/me')
      .then(({ data }) => { setUser(data); setAccessToken(token); })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  // Listen for forced logout (e.g. refresh token expired)
  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const guestLogin = async (bookingNumber: string, lastName: string) => {
    const { data } = await api.post('/auth/guest-portal', { bookingNumber, lastName });
    const guestUser: AuthUser = {
      id: data.booking.guest.id ?? '',
      email: data.booking.guest.email ?? '',
      firstName: data.booking.guest.firstName,
      lastName: data.booking.guest.lastName,
      role: UserRole.GUEST,
      status: 'ACTIVE' as const,
      emailVerified: false,
      guest: { id: data.booking.guest.id, loyaltyPoints: 0 },
      staff: null,
      // Store bookingId so BillPage can retrieve the invoice
      bookingId: data.booking.id,
      // Booking summary (rooms + dates) so the guest home can render it offline
      booking: {
        id: data.booking.id,
        bookingNumber: data.booking.bookingNumber,
        checkInDate: data.booking.checkInDate,
        checkOutDate: data.booking.checkOutDate,
        rooms: (data.booking.rooms ?? []).map((r: any) => ({
          roomNumber: r.room?.roomNumber ?? '',
          categoryName: r.room?.category?.name ?? '',
        })),
      },
    } as AuthUser & { bookingId: string };
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('isGuest', 'true');
    localStorage.setItem('guestUser', JSON.stringify(guestUser));
    setAccessToken(data.accessToken);
    setUser(guestUser);
  };

  const isRole = (...roles: UserRole[]) => !!user && roles.includes(user.role);

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, guestLogin, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
