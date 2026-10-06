import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRightIcon,
  BellIcon,
  BowlFoodIcon,
  CheckCircleIcon,
  DotsThreeIcon,
  FlowerLotusIcon,
  ForkKnifeIcon,
  TShirtIcon,
  WrenchIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { ServiceStatus, ServiceType } from '@shared/index';
import clsx from 'clsx';
import { EmptyState, Panel, riseItem, SkeletonRows, snappy, spring, StatusDot } from '@/components/admin/ui';
import type { Slice } from './useDashboardData';
import type { ServiceRequestRow } from './types';
import { TileGate, TileLink } from './parts';
import { openRequests, shortAgo, useMinuteTick } from './selectors';

const MAX_ROWS = 6;

const TYPE_ICON: Record<ServiceType, Icon> = {
  [ServiceType.ROOM_SERVICE]: ForkKnifeIcon,
  [ServiceType.LAUNDRY]: TShirtIcon,
  [ServiceType.SPA]: FlowerLotusIcon,
  [ServiceType.RESTAURANT]: BowlFoodIcon,
  [ServiceType.MAINTENANCE]: WrenchIcon,
  [ServiceType.CONCIERGE]: BellIcon,
  [ServiceType.OTHER]: DotsThreeIcon,
};

const TYPE_LABEL: Record<ServiceType, string> = {
  [ServiceType.ROOM_SERVICE]: 'Room service',
  [ServiceType.LAUNDRY]: 'Laundry',
  [ServiceType.SPA]: 'Spa',
  [ServiceType.RESTAURANT]: 'Restaurant',
  [ServiceType.MAINTENANCE]: 'Maintenance',
  [ServiceType.CONCIERGE]: 'Concierge',
  [ServiceType.OTHER]: 'Other',
};

/** Copied from the staff ServiceQueuePage so the admin module doesn't import from a page. */
const PRIORITY_LABEL: Record<number, string> = { 1: 'Low', 2: 'Normal', 3: 'High', 4: 'Urgent', 5: 'Critical' };

function priorityTone(p: number) {
  if (p >= 4) return 'bg-rose-50 text-rose-700 ring-rose-600/15';
  if (p === 3) return 'bg-amber-50 text-amber-800 ring-amber-600/20';
  return 'bg-zinc-100 text-zinc-600 ring-zinc-500/10';
}

interface ServiceQueueTileProps {
  services: Slice<ServiceRequestRow[]>;
  className?: string;
}

/**
 * Intelligent List archetype: the open queue in server priority order. New or
 * re-prioritised tickets glide into place (`layout` + AnimatePresence).
 */
export function ServiceQueueTile({ services, className }: ServiceQueueTileProps) {
  const open = useMemo(() => openRequests(services.data), [services.data]);

  return (
    <Panel
      variants={riseItem}
      eyebrow="Service queue"
      title={
        services.data ? (
          <>
            <span className="font-mono tabular-nums">{open.length}</span> open {open.length === 1 ? 'request' : 'requests'}
          </>
        ) : (
          'Open requests'
        )
      }
      action={
        <TileLink to="/staff/services" icon={ArrowUpRightIcon}>
          Open queue
        </TileLink>
      }
      className={className}
    >
      <TileGate
        slice={services}
        skeleton={<SkeletonRows rows={4} />}
        onRetry={services.reload}
        errorTitle="Couldn't load service requests"
      >
        {() =>
          open.length === 0 ? (
            <EmptyState
              compact
              icon={CheckCircleIcon}
              title="Queue is clear"
              description="Guest requests from the portal land here the moment they're raised."
            />
          ) : (
            <QueueList rows={open.slice(0, MAX_ROWS)} more={open.length - MAX_ROWS} />
          )
        }
      </TileGate>
    </Panel>
  );
}

function QueueList({ rows, more }: { rows: ServiceRequestRow[]; more: number }) {
  useMinuteTick();
  return (
    <>
      <ul className="-my-1 divide-y divide-zinc-100">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((sr) => (
            <motion.li
              key={sr.id}
              layout
              transition={spring}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 16, transition: snappy }}
            >
              <QueueRow sr={sr} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {more > 0 && (
        <p className="mt-3 text-xs text-zinc-500">
          <span className="font-mono tabular-nums text-zinc-700">+{more}</span> more waiting in the queue
        </p>
      )}
    </>
  );
}

function QueueRow({ sr }: { sr: ServiceRequestRow }) {
  const IconCmp = TYPE_ICON[sr.type] ?? DotsThreeIcon;
  const room = sr.booking?.rooms?.[0]?.room?.roomNumber;
  const assignee = sr.assignedTo?.user
    ? `${sr.assignedTo.user.firstName} ${sr.assignedTo.user.lastName}`.trim()
    : null;
  const inProgress = sr.status === ServiceStatus.IN_PROGRESS;

  return (
    <div className="flex items-start gap-3 py-3">
      <span
        title={TYPE_LABEL[sr.type]}
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-zinc-600 ring-1 ring-inset ring-zinc-200/70"
      >
        <IconCmp size={17} weight="regular" />
        <span className="sr-only">{TYPE_LABEL[sr.type]}</span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900">{sr.description}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-500">
          <span className="font-mono tabular-nums text-zinc-600">{room ? `#${room}` : sr.ticketNumber}</span>
          <span aria-hidden>·</span>
          <span className="font-mono tabular-nums">{shortAgo(sr.requestedAt)}</span>
          <span aria-hidden>·</span>
          <span className={clsx('truncate', !assignee && 'text-zinc-400')}>{assignee ?? 'Unassigned'}</span>
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className={clsx(
            'rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
            priorityTone(sr.priority),
          )}
        >
          {PRIORITY_LABEL[sr.priority] ?? `P${sr.priority}`}
        </span>
        <span
          className={clsx(
            'flex items-center gap-1.5 text-[11px] font-medium',
            inProgress ? 'text-lagoon-700' : 'text-amber-700',
          )}
        >
          <StatusDot tone={inProgress ? 'lagoon' : 'amber'} pulse={!inProgress} />
          {inProgress ? 'In progress' : 'Waiting'}
        </span>
      </div>
    </div>
  );
}
