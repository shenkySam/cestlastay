/**
 * Local mirror of the relevant shapes from the Hotel-Manager monorepo's
 * `@hms/shared` package (packages/shared/src/types/{room,booking}.types.ts).
 *
 * This landing page is a standalone codebase, so it cannot import the
 * workspace package directly. Keep these in sync if the API contract changes.
 */

export type RoomStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'MAINTENANCE'
  | 'CLEANING'
  | 'OUT_OF_ORDER';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED';

/** Mirrors @hms/shared RoomType / BookingSource enums (kept loose on purpose). */
export type RoomType = string;
export type BookingSource = string;

export interface IRoomCategory {
  id: string;
  name: string;
  type: RoomType;
  description?: string;
  basePrice: number;
  maxOccupancy: number;
  amenities: string[];
  images: string[];
}

export interface IRoom {
  id: string;
  roomNumber: string;
  categoryId: string;
  category?: IRoomCategory;
  floor: number;
  status: RoomStatus;
  lastCleanedAt?: string;
  maintenanceNotes?: string;
  createdAt: string;
  updatedAt: string;
}

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
  rooms?: IBookingRoom[];
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  status: BookingStatus;
  source: BookingSource;
  totalAmount: number;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for the (future) public self-service booking endpoint
 * `POST /bookings/public`. See the plan's "Out of scope / future" section.
 */
export interface CreatePublicBookingRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  checkInDate: string; // ISO date
  checkOutDate: string; // ISO date
  numberOfGuests: number;
  categoryId?: string;
  specialRequests?: string;
}
