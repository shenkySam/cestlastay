import { useEffect, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { BookingSource, BookingStatus, IBooking, IRoom, RoomStatus, ServiceStatus } from '@shared/index';
import { dateKey, todayKey } from '@/components/admin/ui';
import type { ServiceRequestRow } from './types';

const INACTIVE: string[] = [BookingStatus.CANCELLED, BookingStatus.NO_SHOW];

/** Today's arrivals and departures by stored calendar date (timezone-safe). */
export function todaysMovements(bookings: IBooking[] | null, today = todayKey()) {
  const live = (bookings ?? []).filter((b) => !INACTIVE.includes(b.status));
  return {
    arrivals: live.filter((b) => dateKey(b.checkInDate) === today),
    departures: live.filter((b) => dateKey(b.checkOutDate) === today),
  };
}

export const hasArrived = (b: IBooking) =>
  b.status === BookingStatus.CHECKED_IN || b.status === BookingStatus.CHECKED_OUT;

export const hasDeparted = (b: IBooking) => b.status === BookingStatus.CHECKED_OUT;

const OPEN: string[] = [ServiceStatus.PENDING, ServiceStatus.IN_PROGRESS];

/** PENDING + IN_PROGRESS tickets, keeping the server's priority-desc, oldest-first order. */
export function openRequests(services: ServiceRequestRow[] | null) {
  return (services ?? []).filter((s) => OPEN.includes(s.status));
}

export function roomsInTurnover(rooms: IRoom[] | null) {
  return (rooms ?? []).filter((r) => r.status === RoomStatus.CLEANING).length;
}

export const OTA_SOURCES: string[] = [
  BookingSource.BOOKING_COM,
  BookingSource.AIRBNB,
  BookingSource.EXPEDIA,
  BookingSource.AGODA,
  BookingSource.OTHER_OTA,
];

export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

/** "12m ago", "3h ago", "2d ago" */
export function shortAgo(iso: string) {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true })
    .replace(/ seconds?/, 's')
    .replace(/ minutes?/, 'm')
    .replace(/ hours?/, 'h')
    .replace(/ days?/, 'd')
    .replace(/ months?/, 'mo')
    .replace(/ years?/, 'y');
}

/** Re-render once a minute so relative times ("12m ago") stay honest. */
export function useMinuteTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
}
