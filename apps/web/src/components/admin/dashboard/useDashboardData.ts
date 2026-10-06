import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';
import { IBooking, INotification, IRoom, NotificationType } from '@shared/index';
import type {
  HousekeepingTaskRow,
  Overview,
  RatingsSummary,
  RevenuePoint,
  ServiceRequestRow,
  SourceRow,
} from './types';

interface DashboardDataMap {
  overview30: Overview;
  overview60: Overview;
  revenueByDay: RevenuePoint[];
  bySource: SourceRow[];
  rooms: IRoom[];
  bookings: IBooking[];
  services: ServiceRequestRow[];
  housekeeping: HousekeepingTaskRow[];
  ratingsSummary: RatingsSummary;
}

export type SliceKey = keyof DashboardDataMap;

const ENDPOINTS: Record<SliceKey, string> = {
  overview30: '/analytics/overview?days=30',
  overview60: '/analytics/overview?days=60',
  revenueByDay: '/analytics/revenue-by-day?days=30',
  bySource: '/analytics/bookings-by-source?days=30',
  rooms: '/rooms',
  bookings: '/bookings',
  services: '/services',
  housekeeping: '/housekeeping',
  ratingsSummary: '/ratings/summary',
};

const KEYS = Object.keys(ENDPOINTS) as SliceKey[];

interface SliceState<T> {
  data: T | null;
  /** A request for this slice is in flight (tiles show skeletons only while `data` is null) */
  loading: boolean;
  /** The last request failed (tiles keep stale data if they have it) */
  error: boolean;
}

export interface Slice<T> extends SliceState<T> {
  reload: () => void;
}

type State = { [K in SliceKey]: SliceState<DashboardDataMap[K]> };
type LooseState = Record<SliceKey, SliceState<unknown>>;

export type Slices = { [K in SliceKey]: Slice<DashboardDataMap[K]> };

/** A guest movement that just arrived over the socket — drives the Today tile's "Live" badge. */
export interface LiveEvent {
  kind: 'checked-in' | 'checked-out';
  id: string;
  guestName: string;
  at: number;
}

const initialState = Object.fromEntries(
  KEYS.map((k) => [k, { data: null, loading: true, error: false }]),
) as unknown as State;

/**
 * Everything the dashboard shows, fetched in parallel with Promise.allSettled so
 * each tile owns its own loading / error / retry. Socket events keep rooms,
 * bookings, service requests and housekeeping live without a page reload.
 */
export function useDashboardData() {
  const { socket } = useSocket();
  const [state, setState] = useState<State>(initialState);
  const [lastEvent, setLastEvent] = useState<LiveEvent | null>(null);
  const alive = useRef(true);
  const seq = useRef(Object.fromEntries(KEYS.map((k) => [k, 0])) as Record<SliceKey, number>);

  const fetchSlices = useCallback(async (keys: SliceKey[]) => {
    const tickets = keys.map((k) => (seq.current[k] += 1));
    setState((s) => {
      const next = { ...s } as LooseState;
      for (const k of keys) next[k] = { ...s[k], loading: true };
      return next as State;
    });

    const results = await Promise.allSettled(keys.map((k) => api.get(ENDPOINTS[k])));
    if (!alive.current) return;

    setState((s) => {
      const next = { ...s } as LooseState;
      results.forEach((r, i) => {
        const k = keys[i];
        if (seq.current[k] !== tickets[i]) return; // a newer request owns this slice
        next[k] =
          r.status === 'fulfilled'
            ? { data: r.value.data, loading: false, error: false }
            : { data: s[k].data, loading: false, error: true };
      });
      return next as State;
    });
  }, []);

  useEffect(() => {
    alive.current = true;
    void fetchSlices(KEYS);
    return () => {
      alive.current = false;
    };
  }, [fetchSlices]);

  useEffect(() => {
    if (!socket) return;

    const onRoomStatus = (room: IRoom) => {
      setState((s) => {
        const list = s.rooms.data;
        if (!list) return s;
        return { ...s, rooms: { ...s.rooms, data: list.map((r) => (r.id === room.id ? { ...r, ...room } : r)) } };
      });
    };

    const onMovement = (kind: LiveEvent['kind'], booking: IBooking) => {
      setState((s) => {
        const list = s.bookings.data;
        if (!list) return s;
        const exists = list.some((b) => b.id === booking.id);
        const data = exists
          ? list.map((b) => (b.id === booking.id ? { ...b, ...booking } : b))
          : [booking, ...list].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        return { ...s, bookings: { ...s.bookings, data } };
      });
      // Check-in/out flips room status server-side without a room event, and
      // check-out creates turnover tasks — refresh both quietly.
      void fetchSlices(kind === 'checked-out' ? ['rooms', 'housekeeping'] : ['rooms']);
      setLastEvent({
        kind,
        id: booking.id,
        guestName: [booking.guest?.firstName, booking.guest?.lastName].filter(Boolean).join(' '),
        at: Date.now(),
      });
    };

    const onCheckedIn = (booking: IBooking) => onMovement('checked-in', booking);
    const onCheckedOut = (booking: IBooking) => onMovement('checked-out', booking);

    const onNotification = (n: INotification) => {
      if (n.type === NotificationType.SERVICE_REQUEST) void fetchSlices(['services']);
      else if (n.type === NotificationType.HOUSEKEEPING_ALERT) void fetchSlices(['housekeeping']);
    };

    socket.on('room:status-changed', onRoomStatus);
    socket.on('booking:checked-in', onCheckedIn);
    socket.on('booking:checked-out', onCheckedOut);
    socket.on('notification:new', onNotification);
    return () => {
      socket.off('room:status-changed', onRoomStatus);
      socket.off('booking:checked-in', onCheckedIn);
      socket.off('booking:checked-out', onCheckedOut);
      socket.off('notification:new', onNotification);
    };
  }, [socket, fetchSlices]);

  const reloaders = useMemo(
    () =>
      Object.fromEntries(KEYS.map((k) => [k, () => void fetchSlices([k])])) as Record<SliceKey, () => void>,
    [fetchSlices],
  );

  const slices = useMemo(() => {
    const out = {} as Record<SliceKey, Slice<unknown>>;
    for (const k of KEYS) out[k] = { ...state[k], reload: reloaders[k] };
    return out as Slices;
  }, [state, reloaders]);

  return { ...slices, refetch: fetchSlices, lastEvent };
}

export type DashboardData = ReturnType<typeof useDashboardData>;
