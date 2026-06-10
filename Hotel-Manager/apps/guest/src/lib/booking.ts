import api from './api';
import type {
  IRoomCategory,
  IRoom,
  IBooking,
  CreatePublicBookingRequest,
} from '../types/booking.types';

/**
 * Booking wiring — gated behind VITE_ENABLE_BOOKING_API.
 *
 * The typed functions below mirror the real Hotel-Manager API contract so that
 * flipping the flag on (once the public endpoints + CORS exist) requires no
 * rewrite. Until then, `submitReservation` short-circuits to an elegant local
 * confirmation and performs no network request.
 */
export const isBookingApiEnabled =
  import.meta.env.VITE_ENABLE_BOOKING_API === 'true';

// ── Typed API calls (only used when the flag is ON) ───────────────────────

/** GET /rooms/categories — list room types (must be made @Public() on the API). */
export async function getRoomCategories(): Promise<IRoomCategory[]> {
  const { data } = await api.get<IRoomCategory[]>('/rooms/categories');
  return data;
}

/** GET /rooms/availability?checkIn=&checkOut=&categoryId= */
export async function checkAvailability(
  checkIn: string,
  checkOut: string,
  categoryId?: string,
): Promise<IRoom[]> {
  const { data } = await api.get<IRoom[]>('/rooms/availability', {
    params: { checkIn, checkOut, categoryId },
  });
  return data;
}

/** POST /bookings/public — future public self-service booking endpoint. */
export async function createBooking(
  payload: CreatePublicBookingRequest,
): Promise<IBooking> {
  const { data } = await api.post<IBooking>('/bookings/public', payload);
  return data;
}

// ── High-level orchestration used by the reservation form ─────────────────

export interface ReservationResult {
  ok: boolean;
  bookingNumber?: string;
  message: string;
}

export async function submitReservation(
  payload: CreatePublicBookingRequest,
): Promise<ReservationResult> {
  if (!isBookingApiEnabled) {
    // Flag OFF — no network call. The public endpoints and CORS for this
    // origin don't exist yet, so we acknowledge the request locally.
    await new Promise((resolve) => setTimeout(resolve, 900));
    // eslint-disable-next-line no-console
    console.info("[C'est La Stay] Reservation request (booking API disabled):", payload);
    return {
      ok: true,
      message:
        'Request received — our concierge will confirm your stay by email within 24 hours.',
    };
  }

  try {
    const booking = await createBooking(payload);
    const confirmed = booking.status === 'CONFIRMED';
    return {
      ok: true,
      bookingNumber: booking.bookingNumber,
      message: confirmed
        ? `Your stay is confirmed — reservation ${booking.bookingNumber}. A confirmation is on its way to your inbox.`
        : `Request submitted — reservation ${booking.bookingNumber}. Our team will confirm availability and email you shortly.`,
    };
  } catch {
    return {
      ok: false,
      message:
        'We couldn’t complete your reservation just now. Please try again, or call us directly.',
    };
  }
}
