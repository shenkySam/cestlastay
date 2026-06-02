import { BookingStatus, BookingSource } from '../constants/statuses';
import { IGuest } from './user.types';
import { IRoom } from './room.types';

export interface IBooking {
  id: string;
  bookingNumber: string;
  guestId: string;
  guest?: IGuest;
  roomId: string;
  room?: IRoom;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  status: BookingStatus;
  source: BookingSource;
  roomRate: number;
  totalAmount: number;
  discountCode?: string;
  discountAmount?: number;
  specialRequests?: string;
  actualCheckInAt?: string;
  actualCheckOutAt?: string;
  otaBookingId?: string;
  otaCommission?: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
