import { memo, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarCheckIcon, SignInIcon, SignOutIcon } from '@phosphor-icons/react';
import { IBooking } from '@shared/index';
import {
  Avatar,
  EmptyState,
  humanize,
  Panel,
  pop,
  riseItem,
  SegmentedControl,
  SkeletonRows,
  snappy,
  SOURCE_LABEL,
  spring,
  StatusDot,
} from '@/components/admin/ui';
import { roomNumbersLabel } from '@/lib/rooms';
import type { LiveEvent, Slice } from './useDashboardData';
import { TileGate } from './parts';
import { hasArrived, hasDeparted, todaysMovements } from './selectors';

type Tab = 'arrivals' | 'departures';

const MAX_ROWS = 6;

interface TodayTileProps {
  bookings: Slice<IBooking[]>;
  lastEvent: LiveEvent | null;
  className?: string;
}

/** Live Status archetype: today's arrivals/departures with breathing "expected" lights. */
export function TodayTile({ bookings, lastEvent, className }: TodayTileProps) {
  const [tab, setTab] = useState<Tab>('arrivals');
  const { arrivals, departures } = useMemo(() => todaysMovements(bookings.data), [bookings.data]);

  return (
    <Panel
      variants={riseItem}
      eyebrow="Today"
      title="Arrivals and departures"
      action={<LiveBadge event={lastEvent} />}
      className={className}
    >
      <SegmentedControl
        size="sm"
        layoutId="today-tabs"
        aria-label="Guest movements"
        className="self-start"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'arrivals', label: 'Arrivals', icon: SignInIcon, count: bookings.data ? arrivals.length : undefined },
          {
            value: 'departures',
            label: 'Departures',
            icon: SignOutIcon,
            count: bookings.data ? departures.length : undefined,
          },
        ]}
      />
      <TileGate
        slice={bookings}
        skeleton={<SkeletonRows rows={4} className="mt-2" />}
        onRetry={bookings.reload}
        errorTitle="Couldn't load bookings"
      >
        {() => <MovementList rows={tab === 'arrivals' ? arrivals : departures} tab={tab} />}
      </TileGate>
    </Panel>
  );
}

function MovementList({ rows, tab }: { rows: IBooking[]; tab: Tab }) {
  const isDone = tab === 'arrivals' ? hasArrived : hasDeparted;
  const doneAt = (b: IBooking) => (tab === 'arrivals' ? b.actualCheckInAt : b.actualCheckOutAt) ?? '';
  const sorted = [...rows.filter((b) => !isDone(b)), ...rows.filter(isDone).sort((a, b) => doneAt(b).localeCompare(doneAt(a)))];

  if (sorted.length === 0) {
    return (
      <EmptyState
        compact
        className="mt-2"
        icon={CalendarCheckIcon}
        title={tab === 'arrivals' ? 'No arrivals today' : 'No departures today'}
        description={
          tab === 'arrivals'
            ? 'Bookings that start today show up here with a live check-in status.'
            : 'Stays that end today show up here with a live check-out status.'
        }
        action={
          <Link to="/admin/bookings" className="btn-secondary px-3.5 py-1.5 text-[13px]">
            Open bookings
          </Link>
        }
      />
    );
  }

  const hidden = sorted.length - MAX_ROWS;
  return (
    <>
      <ul className="mt-3 divide-y divide-zinc-100">
        <AnimatePresence initial={false} mode="popLayout">
          {sorted.slice(0, MAX_ROWS).map((b) => {
            const done = isDone(b);
            const at = doneAt(b);
            return (
              <motion.li
                key={b.id}
                layout
                transition={spring}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: snappy }}
                className="flex items-center gap-3 py-3"
              >
                <Avatar firstName={b.guest?.firstName} lastName={b.guest?.lastName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {[b.guest?.firstName, b.guest?.lastName].filter(Boolean).join(' ') || 'Guest'}
                  </p>
                  <p className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-zinc-500">
                    <span className="shrink-0 font-mono tabular-nums text-zinc-600">{roomNumbersLabel(b)}</span>
                    <span className="truncate rounded-full bg-zinc-100 px-1.5 py-px text-[10px] font-medium text-zinc-600">
                      {SOURCE_LABEL[b.source] ?? humanize(b.source)}
                    </span>
                  </p>
                </div>
                {done ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <StatusDot tone="emerald" pulse={false} />
                    {tab === 'arrivals' ? 'Arrived' : 'Departed'}
                    {at && <span className="font-mono font-normal tabular-nums text-zinc-500">{format(new Date(at), 'HH:mm')}</span>}
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-amber-700">
                    <StatusDot tone="amber" />
                    Expected
                  </span>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {hidden > 0 && (
        <Link
          to="/admin/bookings"
          className="mt-2 self-start rounded-full px-1 text-xs font-medium text-lagoon-700 hover:text-lagoon-800"
        >
          <span className="font-mono tabular-nums">+{hidden}</span> more in bookings
        </Link>
      )}
    </>
  );
}

/** Overshoot-pop badge for a live check-in/out; holds ~3s, then exits. */
const LiveBadge = memo(function LiveBadge({ event }: { event: LiveEvent | null }) {
  const [shown, setShown] = useState<LiveEvent | null>(null);

  useEffect(() => {
    if (!event) return;
    setShown(event);
    const timer = window.setTimeout(() => setShown(null), 3000);
    return () => window.clearTimeout(timer);
  }, [event]);

  return (
    <AnimatePresence>
      {shown && (
        <motion.span
          key={shown.at}
          role="status"
          initial={{ opacity: 0, scale: 0.6, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, transition: snappy }}
          transition={pop}
          className="inline-flex max-w-[15rem] items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15"
        >
          <StatusDot tone="emerald" />
          <span className="truncate">
            Live · {shown.guestName || 'Guest'} {shown.kind === 'checked-in' ? 'checked in' : 'checked out'}
          </span>
        </motion.span>
      )}
    </AnimatePresence>
  );
});
