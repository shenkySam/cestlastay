import { NotificationType } from '../constants/statuses';

export interface INotification {
  id: string;
  userId: string;
  type: NotificationType;
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  link?: string;
  readAt?: string;
  createdAt: string;
}

// WebSocket event payloads
export interface RoomStatusChangedPayload {
  roomId: string;
  roomNumber: string;
  status: string;
  previousStatus: string;
  updatedAt: string;
}

export interface BookingCheckedInPayload {
  bookingId: string;
  bookingNumber: string;
  roomNumber: string;
  guestName: string;
  timestamp: string;
}

export interface ServiceCreatedPayload {
  serviceId: string;
  ticketNumber: string;
  type: string;
  priority: number;
  description: string;
  roomNumber: string;
  guestName: string;
  requestedAt: string;
}

export interface HousekeepingTaskPayload {
  taskId: string;
  roomNumber: string;
  taskType: string;
  priority: number;
  scheduledFor: string;
}
