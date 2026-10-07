import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRightIcon, BedIcon, SignInIcon, SignOutIcon } from '@phosphor-icons/react';
import { IBooking, IRoom, RoomStatus } from '@shared/index';
import { useSocket } from '@/contexts/SocketContext';
import { roomNumbersLabel } from '@/lib/rooms';
import { StatusDot, humanize, pop, snappy } from '@/components/admin/ui';
import type { Tone } from '@/components/admin/ui';

type NewActivity =
  | { kind: 'checked-in' | 'checked-out'; guest: string; rooms: string | null }
  | { kind: 'room'; roomNumber: string; status: RoomStatus };

type Activity = NewActivity & { id: number };

const HOLD_MS = 3000;
/** Bulk changes shouldn't stack up minutes of pills; keep the latest few. */
const MAX_QUEUED = 5;

const ROOM_TONE: Record<RoomStatus, Tone> = {
  [RoomStatus.AVAILABLE]: 'emerald',
  [RoomStatus.OCCUPIED]: 'lagoon',
  [RoomStatus.RESERVED]: 'lagoon',
  [RoomStatus.CLEANING]: 'amber',
  [RoomStatus.MAINTENANCE]: 'rose',
  [RoomStatus.OUT_OF_ORDER]: 'rose',
};

function guestName(booking: IBooking): string {
  const name = [booking.guest?.firstName, booking.guest?.lastName].filter(Boolean).join(' ');
  return name || 'A guest';
}

function roomsOf(booking: IBooking): string | null {
  const label = roomNumbersLabel(booking);
  return label === '—' ? null : label;
}

/**
 * Dynamic Island: a dark pill under the top bar that announces check-ins,
 * check-outs and room status changes as they arrive over the socket. One at
 * a time — each pops in, holds for 3s, leaves, then the next one shows.
 */
export function LiveActivityIsland() {
  const { socket } = useSocket();
  const [current, setCurrent] = useState<Activity | null>(null);
  const queueRef = useRef<Activity[]>([]);
  const showingRef = useRef(false);
  const nextId = useRef(0);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    showingRef.current = next !== null;
    setCurrent(next);
  }, []);

  const enqueue = useCallback(
    (activity: NewActivity) => {
      nextId.current += 1;
      queueRef.current.push({ ...activity, id: nextId.current });
      if (queueRef.current.length > MAX_QUEUED) queueRef.current.shift();
      if (!showingRef.current) showNext();
    },
    [showNext],
  );

  useEffect(() => {
    if (!socket) return;
    const onCheckedIn = (booking: IBooking) =>
      enqueue({ kind: 'checked-in', guest: guestName(booking), rooms: roomsOf(booking) });
    const onCheckedOut = (booking: IBooking) =>
      enqueue({ kind: 'checked-out', guest: guestName(booking), rooms: roomsOf(booking) });
    const onRoomStatus = (room: IRoom) => {
      if (!room?.roomNumber || !room.status) return;
      enqueue({ kind: 'room', roomNumber: room.roomNumber, status: room.status });
    };

    socket.on('booking:checked-in', onCheckedIn);
    socket.on('booking:checked-out', onCheckedOut);
    socket.on('room:status-changed', onRoomStatus);
    return () => {
      socket.off('booking:checked-in', onCheckedIn);
      socket.off('booking:checked-out', onCheckedOut);
      socket.off('room:status-changed', onRoomStatus);
    };
  }, [socket, enqueue]);

  // Hold the visible pill, then let it exit; AnimatePresence's onExitComplete shows the next.
  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(() => setCurrent(null), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [current]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[76px] z-40 mx-auto w-fit max-w-[calc(100vw-2rem)] lg:left-[272px]"
    >
      <AnimatePresence onExitComplete={showNext}>
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.6, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: pop }}
            exit={{ opacity: 0, scale: 0.9, y: -8, transition: snappy }}
            className="flex items-center gap-2.5 rounded-full border border-white/10 bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_16px_32px_-12px_rgb(24_24_27/0.45)]"
          >
            <ActivityContent activity={current} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActivityContent({ activity }: { activity: Activity }) {
  if (activity.kind === 'room') {
    return (
      <>
        <StatusDot tone={ROOM_TONE[activity.status] ?? 'zinc'} />
        <BedIcon size={16} weight="regular" aria-hidden className="shrink-0 text-zinc-400" />
        <span className="whitespace-nowrap">
          Room <span className="font-mono tabular-nums">{activity.roomNumber}</span>
        </span>
        <ArrowRightIcon size={14} weight="regular" aria-hidden className="shrink-0 text-zinc-500" />
        <span className="sr-only">is now</span>
        <span className="whitespace-nowrap text-zinc-300">{humanize(activity.status)}</span>
      </>
    );
  }

  const checkedIn = activity.kind === 'checked-in';
  const IconCmp = checkedIn ? SignInIcon : SignOutIcon;
  return (
    <>
      <StatusDot tone={checkedIn ? 'emerald' : 'lagoon'} />
      <IconCmp size={16} weight="regular" aria-hidden className="shrink-0 text-zinc-400" />
      <span className="min-w-0 truncate">
        {activity.guest} <span className="text-zinc-400">{checkedIn ? 'checked in' : 'checked out'}</span>
      </span>
      {activity.rooms && (
        <>
          <span aria-hidden className="text-zinc-600">
            ·
          </span>
          <span className="whitespace-nowrap font-mono tabular-nums text-zinc-300">{activity.rooms}</span>
        </>
      )}
    </>
  );
}
