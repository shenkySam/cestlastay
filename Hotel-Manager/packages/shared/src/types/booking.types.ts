import { BookingStatus, BookingSource } from '../constants/statuses';
import { IGuest } from './user.types';
import { IRoom } from './room.types';

export interface IBookingRoom {
  id: string;
  bookingId: string;
  roomId: string;
  room?: IRoom;
  roomRate: number;
  createdAt: string;
}

export interface IBooking {
  id: string;
  bookingNumber: string;
  guestId: string;
  guest?: IGuest;
  rooms?: IBookingRoom[];
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  status: BookingStatus;
  source: BookingSource;
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
