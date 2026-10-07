import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import {
  BedIcon,
  BroomIcon,
  CalendarCheckIcon,
  DoorOpenIcon,
  ProhibitIcon,
  UserIcon,
  WrenchIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { IRoom, RoomStatus } from '@shared/index';
import clsx from 'clsx';
import { EmptyState, Panel, pop, riseItem, Skeleton, snappy, spring } from '@/components/admin/ui';
import type { Slice } from './useDashboardData';
import { TileGate, TileLink } from './parts';

interface StatusStyle {
  label: string;
  icon: Icon;
  chip: string;
  /** Small corner glyph so status never relies on colour alone */
  glyph?: Icon;
}

const STATUS: Record<RoomStatus, StatusStyle> = {
  [RoomStatus.OCCUPIED]: {
    label: 'Occupied',
    icon: UserIcon,
    chip: 'bg-lagoon-600 text-white ring-lagoon-600',
  },
  [RoomStatus.RESERVED]: {
    label: 'Reserved',
    icon: CalendarCheckIcon,
    chip: 'bg-lagoon-50 text-lagoon-800 ring-lagoon-300',
    glyph: CalendarCheckIcon,
  },
  [RoomStatus.AVAILABLE]: {
    label: 'Available',
    icon: DoorOpenIcon,
    chip: 'bg-white text-zinc-700 ring-zinc-200',
  },
  [RoomStatus.CLEANING]: {
    label: 'Cleaning',
    icon: BroomIcon,
    chip: 'bg-amber-50 text-amber-800 ring-amber-300',
    glyph: BroomIcon,
  },
  [RoomStatus.MAINTENANCE]: {
    label: 'Maintenance',
    icon: WrenchIcon,
    chip: 'bg-rose-50 text-rose-700 ring-rose-300',
    glyph: WrenchIcon,
  },
  [RoomStatus.OUT_OF_ORDER]: {
    label: 'Out of order',
    icon: ProhibitIcon,
    chip: 'bg-rose-50 text-rose-700 ring-rose-300',
    glyph: ProhibitIcon,
  },
};

const LEGEND_ORDER: RoomStatus[] = [
  RoomStatus.OCCUPIED,
  RoomStatus.RESERVED,
  RoomStatus.AVAILABLE,
  RoomStatus.CLEANING,
  RoomStatus.MAINTENANCE,
  RoomStatus.OUT_OF_ORDER,
];

const MotionLink = motion.create(Link);

interface RoomBoardTileProps {
  rooms: Slice<IRoom[]>;
  className?: string;
}

function BoardSkeleton() {
  return (
    <div aria-hidden className="space-y-5">
      {[9, 7, 5].map((n, row) => (
        <div key={row} className="grid gap-2 sm:grid-cols-[4.5rem_1fr]">
          <Skeleton className="mt-3 h-3 w-12 rounded-full" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: n }, (_, i) => (
              <Skeleton key={i} className="h-11 w-[3.25rem]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Every room by floor, coloured by live status; chips animate when the socket flips a status. */
export function RoomBoardTile({ rooms, className }: RoomBoardTileProps) {
  return (
    <Panel
      variants={riseItem}
      eyebrow="Room board"
      title="Live status by floor"
      action={<TileLink to="/admin/rooms">Manage rooms</TileLink>}
      className={className}
    >
      <TileGate slice={rooms} skeleton={<BoardSkeleton />} onRetry={rooms.reload} errorTitle="Couldn't load rooms">
        {(list) =>
          list.length === 0 ? (
            <EmptyState
              compact
              icon={BedIcon}
              title="No rooms yet"
              description="Add rooms with a floor and category, and they appear here by floor."
              action={
                <Link to="/admin/rooms" className="btn-secondary px-3.5 py-1.5 text-[13px]">
                  Add rooms
                </Link>
              }
            />
          ) : (
            <Board rooms={list} />
          )
        }
      </TileGate>
    </Panel>
  );
}

function Board({ rooms }: { rooms: IRoom[] }) {
  const floors = useMemo(() => {
    const map = new Map<number, IRoom[]>();
    for (const r of rooms) {
      const list = map.get(r.floor) ?? [];
      list.push(r);
      map.set(r.floor, list);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [rooms]);

  const counts = useMemo(() => {
    const out = {} as Record<RoomStatus, number>;
    for (const s of LEGEND_ORDER) out[s] = 0;
    for (const r of rooms) out[r.status] = (out[r.status] ?? 0) + 1;
    return out;
  }, [rooms]);

  // Occupied and Available always; the rest only when a room is in that state.
  const legend = LEGEND_ORDER.filter(
    (s) => counts[s] > 0 || s === RoomStatus.OCCUPIED || s === RoomStatus.AVAILABLE,
  );

  return (
    <>
      <div className="space-y-4">
        {floors.map(([floor, list]) => (
          <div key={floor} className="grid gap-2 sm:grid-cols-[4.5rem_1fr] sm:items-start">
            <p className="eyebrow sm:pt-3.5">
              Floor <span className="font-mono tabular-nums">{floor}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {list.map((room) => (
                <RoomChip key={room.id} room={room} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-6">
        <ul aria-label="Status legend" className="flex flex-wrap gap-x-4 gap-y-2.5 border-t border-zinc-100 pt-4">
          {legend.map((s) => {
            const style = STATUS[s];
            const IconCmp = style.icon;
            return (
              <li key={s} className="flex items-center gap-1.5 text-xs text-zinc-600">
                <span className={clsx('flex size-5 items-center justify-center rounded-md ring-1 ring-inset', style.chip)}>
                  <IconCmp size={11} weight="regular" />
                </span>
                {style.label}
                <span className="font-mono font-medium tabular-nums text-zinc-900">{counts[s]}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

/** Tiny white breathing light for occupied chips (CSS keyframe, isolated + memoized). */
const ChipPulse = memo(function ChipPulse() {
  return (
    <span aria-hidden className="absolute right-1.5 top-1.5 inline-flex size-1.5">
      <span className="absolute inset-0 animate-breathe rounded-full bg-white" />
      <span className="relative inline-flex size-1.5 rounded-full bg-white/90" />
    </span>
  );
});

const RoomChip = memo(function RoomChip({ room }: { room: IRoom }) {
  const style = STATUS[room.status] ?? STATUS[RoomStatus.AVAILABLE];
  const Glyph = style.glyph;
  const StatusIcon = style.icon;
  const [open, setOpen] = useState<'left' | 'right' | null>(null);
  const controls = useAnimationControls();
  const prevStatus = useRef(room.status);

  // A live status change gets a small overshoot pop on top of the colour transition.
  useEffect(() => {
    if (prevStatus.current === room.status) return;
    prevStatus.current = room.status;
    let cancelled = false;
    void controls.start({ scale: 1.12, transition: pop }).then(() => {
      if (!cancelled) void controls.start({ scale: 1, transition: spring });
    });
    return () => {
      cancelled = true;
      controls.stop();
    };
  }, [room.status, controls]);

  const show = (el: HTMLElement) => {
    const box = el.getBoundingClientRect();
    setOpen(box.left + box.width / 2 < window.innerWidth / 2 ? 'left' : 'right');
  };

  const cleaned = room.lastCleanedAt
    ? `Cleaned ${formatDistanceToNowStrict(new Date(room.lastCleanedAt), { addSuffix: true })}`
    : 'No cleaning logged';

  return (
    <div className={clsx('relative', open && 'z-10')}>
      <MotionLink
        to="/admin/rooms"
        layout
        animate={controls}
        whileHover={{ y: -2, transition: snappy }}
        whileTap={{ scale: 0.96, transition: snappy }}
        aria-label={`Room ${room.roomNumber}, ${style.label}${room.category?.name ? `, ${room.category.name}` : ''}`}
        onPointerEnter={(e) => show(e.currentTarget)}
        onPointerLeave={() => setOpen(null)}
        onFocus={(e) => show(e.currentTarget)}
        onBlur={() => setOpen(null)}
        className={clsx(
          'relative flex h-11 min-w-[3.25rem] items-center justify-center rounded-xl px-2 ring-1 ring-inset',
          'font-mono text-sm font-medium tabular-nums',
          'transition-[background-color,color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagoon-500',
          style.chip,
        )}
      >
        {room.roomNumber}
        {room.status === RoomStatus.OCCUPIED && <ChipPulse />}
        {Glyph && <Glyph aria-hidden size={10} weight="regular" className="absolute right-1 top-1 opacity-70" />}
      </MotionLink>

      <AnimatePresence>
        {open && (
          <motion.div
            role="tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            transition={snappy}
            className={clsx(
              'pointer-events-none absolute bottom-full mb-2 w-max max-w-[14rem] rounded-xl bg-white px-3 py-2 text-left',
              'shadow-[0_12px_28px_-12px_rgb(24_24_27/0.22)] ring-1 ring-zinc-200',
              open === 'left' ? 'left-0' : 'right-0',
            )}
          >
            <p className="text-sm font-medium text-zinc-900">
              Room <span className="font-mono tabular-nums">{room.roomNumber}</span>
            </p>
            {room.category?.name && <p className="text-xs text-zinc-500">{room.category.name}</p>}
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-700">
              <StatusIcon size={12} weight="regular" className="text-zinc-400" />
              {style.label}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">{cleaned}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
