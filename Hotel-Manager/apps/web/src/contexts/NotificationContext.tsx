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
  const { user } = useAuth();
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

    socket.on('notification:new', (n: INotification) => {
      setNotifications((prev) => [n, ...prev]);
      toast.success(n.title, { id: n.id });
    });

    return () => {
      socket.emit('unsubscribe', { userId: user.id });
      socket.off('notification:new');
    };
  }, [socket, user]);

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
