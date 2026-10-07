import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { IUser, UserRole, UserStatus } from '@shared/index';
import api from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import type { OAuthProvider } from '@/lib/oauth';

/** Booking summary kept for a signed-in guest (rooms, dates, status). */
export interface GuestBookingSummary {
  id: string;
  bookingNumber: string;
  /** CONFIRMED before arrival, CHECKED_IN during the stay */
  status?: string;
  checkInDate: string;
  checkOutDate: string;
  rooms: { roomNumber: string; categoryName: string }[];
}

interface AuthUser extends Omit<IUser, 'createdAt' | 'updatedAt' | 'emailVerified' | 'lastLoginAt'> {
  staff?: { id: string; employeeId: string; department: string; position: string } | null;
  guest?: { id: string; loyaltyPoints: number } | null;
  /** Guests only: the booking their token is scoped to */
  bookingId?: string;
  booking?: GuestBookingSummary;
}

/** Booking as returned by POST /auth/guest-portal, /auth/guest/google and GET /auth/guest/me */
interface ApiGuestBooking {
  id: string;
  bookingNumber: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  guest: { id: string; firstName: string; lastName: string; email: string | null };
  rooms?: { room?: { roomNumber?: string; category?: { name?: string } } }[];
}

function toGuestUser(booking: ApiGuestBooking): AuthUser {
  return {
    id: booking.guest.id ?? '',
    email: booking.guest.email ?? '',
    firstName: booking.guest.firstName,
    lastName: booking.guest.lastName,
    role: UserRole.GUEST,
    status: UserStatus.ACTIVE,
    guest: { id: booking.guest.id, loyaltyPoints: 0 },
    staff: null,
    // Store bookingId so BillPage can retrieve the invoice
    bookingId: booking.id,
    // Booking summary (rooms + dates + status) so the guest pages can render it offline
    booking: {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      rooms: (booking.rooms ?? []).map((r) => ({
        roomNumber: r.room?.roomNumber ?? '',
        categoryName: r.room?.category?.name ?? '',
      })),
    },
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  /** Exchange a Google / Apple ID token for our session (there is no password login). */
  login: (provider: OAuthProvider, idToken: string) => Promise<void>;
  guestLogin: (bookingNumber: string, lastName: string) => Promise<void>;
  /** Guest sign-in with a Google ID token, matched to a booking by email. */
  guestGoogleLogin: (idToken: string) => Promise<void>;
  logout: () => void;
  /** Re-read the signed-in staff/admin from GET /auth/me (e.g. after their role changed). */
  refreshUser: () => Promise<void>;
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
    window.location.href = isGuest ? '/login?as=guest' : '/login?as=staff';
  }, []);

  // Boot: restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }

    const isGuest = localStorage.getItem('isGuest') === 'true';

    if (isGuest) {
      // Guest tokens have sub=guestId (not a userId) so GET /auth/me doesn't
      // apply. Restore the guest stored at sign-in right away, then refresh the
      // booking (e.g. a pre-arrival guest who has since been checked in).
      const stored = localStorage.getItem('guestUser');
      if (stored) {
        try { setUser(JSON.parse(stored)); setAccessToken(token); }
        catch { logout(); }
      } else {
        // No stored user data — can't restore session, send back to sign-in
        logout();
      }
      setLoading(false);
      if (stored) {
        api.get('/auth/guest/me')
          .then(({ data }) => {
            const guestUser = toGuestUser(data.booking);
            localStorage.setItem('guestUser', JSON.stringify(guestUser));
            setUser(guestUser);
          })
          // An expired token 401s and the api client logs out; otherwise keep the stored copy
          .catch(() => {});
      }
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

  const login = async (provider: OAuthProvider, idToken: string) => {
    const { data } = await api.post(`/auth/${provider}`, { idToken });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const startGuestSession = (data: { accessToken: string; booking: ApiGuestBooking }) => {
    const guestUser = toGuestUser(data.booking);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('isGuest', 'true');
    localStorage.setItem('guestUser', JSON.stringify(guestUser));
    setAccessToken(data.accessToken);
    setUser(guestUser);
  };

  const guestLogin = async (bookingNumber: string, lastName: string) => {
    const { data } = await api.post('/auth/guest-portal', { bookingNumber, lastName });
    startGuestSession(data);
  };

  const guestGoogleLogin = async (idToken: string) => {
    const { data } = await api.post('/auth/guest/google', { idToken });
    startGuestSession(data);
  };

  const refreshUser = useCallback(async () => {
    if (localStorage.getItem('isGuest') === 'true') return;
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      // An invalid session 401s and the api client logs out; otherwise keep the current user
    }
  }, []);

  const isRole = (...roles: UserRole[]) => !!user && roles.includes(user.role);

  return (
    <AuthContext.Provider
      value={{ user, accessToken, loading, login, guestLogin, guestGoogleLogin, logout, refreshUser, isRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
