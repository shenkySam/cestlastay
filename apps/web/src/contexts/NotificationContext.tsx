import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { INotification, UserRole } from '@shared/index';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import api from '@/lib/api';

interface NotificationContextValue {
  notifications: INotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  markRead: () => {},
  markAllRead: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const { user, refreshUser } = useAuth();
  const [notifications, setNotifications] = useState<INotification[]>([]);

  // Guests use a guest-portal token (sub = guestId, not a userId) so
  // the /notifications endpoint would 401 them — skip entirely for guests.
  const isGuest = user?.role === UserRole.GUEST;

  // Fetch existing notifications on mount
  useEffect(() => {
    if (!user || isGuest) return;
    api.get('/notifications', { params: { status: 'UNREAD' } })
      .then(({ data }) => setNotifications(data ?? []))
      .catch(() => {});
  }, [user, isGuest]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!socket || !user || isGuest) return;

    socket.emit('subscribe', { userId: user.id });

    const onNotification = (n: INotification) => {
      setNotifications((prev) => [n, ...prev]);
      toast.success(n.title, { id: n.id });
      // An admin promoted or demoted us: reload the user so ProtectedRoute
      // moves us to the console that matches the new role
      if (n.metadata?.kind === 'ROLE_CHANGED') refreshUser();
    };
    socket.on('notification:new', onNotification);

    return () => {
      socket.emit('unsubscribe', { userId: user.id });
      // Remove only this listener — the admin dashboard listens on the same event
      socket.off('notification:new', onNotification);
    };
  }, [socket, user, refreshUser]);

  const markRead = useCallback((id: string) => {
    api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: 'READ' as const } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    api.patch('/notifications/read-all').catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' as const })));
  }, []);

  const unreadCount = notifications.filter((n) => n.status === 'UNREAD').length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
