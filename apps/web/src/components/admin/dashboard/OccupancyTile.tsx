import { BedIcon, BroomIcon, HourglassMediumIcon, SealCheckIcon } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { HousekeepingStatus, IRoom, RoomStatus } from '@shared/index';
import clsx from 'clsx';
import { EmptyState, ErrorState, Panel, pct, riseItem, Skeleton, StatusDot } from '@/components/admin/ui';
import { RadialGauge } from '@/components/admin/charts';
import type { Slice } from './useDashboardData';
import type { HousekeepingTaskRow, Overview } from './types';
import { TileGate } from './parts';
import { plural } from './selectors';

interface OccupancyTileProps {
  rooms: Slice<IRoom[]>;
  overview30: Slice<Overview>;
  housekeeping: Slice<HousekeepingTaskRow[]>;
  className?: string;
}

interface Step {
  status: HousekeepingStatus;
  label: string;
  icon: Icon;
  active: string;
}

const STEPS: Step[] = [
  {
    status: HousekeepingStatus.PENDING,
    label: 'Pending',
    icon: HourglassMediumIcon,
    active: 'bg-amber-50 text-amber-700 ring-amber-300',
  },
  {
    status: HousekeepingStatus.IN_PROGRESS,
    label: 'Cleaning',
    icon: BroomIcon,
    active: 'bg-amber-50 text-amber-700 ring-amber-300',
  },
  {
    status: HousekeepingStatus.COMPLETED,
    label: 'Awaiting inspection',
    icon: SealCheckIcon,
    active: 'bg-lagoon-50 text-lagoon-700 ring-lagoon-300',
  },
];

function GaugeSkeleton() {
  return (
    <div aria-hidden className="flex flex-col items-center">
      <Skeleton className="size-[168px] rounded-full" />
      <Skeleton className="mt-4 h-3.5 w-28 rounded-full" />
      <Skeleton className="mt-2 h-3 w-36 rounded-full" />
    </div>
  );
}

/** Live occupancy ring from /rooms (socket-updated) plus the housekeeping turnover pipeline. */
export function OccupancyTile({ rooms, overview30, housekeeping, className }: OccupancyTileProps) {
  return (
    <Panel
      variants={riseItem}
      eyebrow="Occupancy"
      action={
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
          <StatusDot tone="lagoon" />
          Live
        </span>
      }
      className={className}
    >
      <TileGate slice={rooms} skeleton={<GaugeSkeleton />} onRetry={rooms.reload} errorTitle="Couldn't load rooms">
        {(list) => {
          const total = list.length;
          const occupied = list.filter((r) => r.status === RoomStatus.OCCUPIED).length;
          const rate = total > 0 ? (occupied / total) * 100 : 0;
          if (total === 0) {
            return (
              <EmptyState
                compact
                icon={BedIcon}
                title="No rooms yet"
                description="Add rooms under Rooms to start tracking occupancy."
              />
            );
          }
          return (
            <div className="flex flex-col items-center text-center">
              <RadialGauge value={rate} label="occupied now" title="Live occupancy" />
              <p className="mt-4 text-sm text-zinc-600">
                <span className="font-mono font-medium tabular-nums text-zinc-900">{occupied}</span> of{' '}
                <span className="font-mono font-medium tabular-nums text-zinc-900">{total}</span> {plural(total, 'room')}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                30-day average{' '}
                {overview30.data ? (
                  <span className="font-mono tabular-nums text-zinc-700">{pct(overview30.data.occupancyRate)}</span>
                ) : (
                  <span className="font-mono text-zinc-400">—</span>
                )}
              </p>
            </div>
          );
        }}
      </TileGate>

      <div className="mt-auto pt-6">
        <div className="border-t border-zinc-100 pt-5">
          <p className="eyebrow">Turnover</p>
          {housekeeping.data ? (
            <TurnoverPipeline tasks={housekeeping.data} />
          ) : housekeeping.error && !housekeeping.loading ? (
            <ErrorState className="mt-3" title="Couldn't load housekeeping" onRetry={housekeeping.reload} />
          ) : (
            <div aria-hidden className="mt-4 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-6 rounded-full" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

/** One inline pipeline — three nodes on a hairline — not three cards. */
function TurnoverPipeline({ tasks }: { tasks: HousekeepingTaskRow[] }) {
  const count = (s: HousekeepingStatus) => tasks.filter((t) => t.status === s).length;
  return (
    <ol className="relative mt-4 grid grid-cols-3">
      <span aria-hidden className="absolute left-[16.66%] right-[16.66%] top-4 h-px bg-zinc-200" />
      {STEPS.map((step) => {
        const n = count(step.status);
        const IconCmp = step.icon;
        return (
          <li key={step.status} className="relative flex flex-col items-center gap-1.5 px-1 text-center">
            <span
              className={clsx(
                'flex size-8 items-center justify-center rounded-full ring-1 transition-colors duration-500',
                n > 0 ? step.active : 'bg-white text-zinc-400 ring-zinc-200',
              )}
            >
              <IconCmp size={15} weight="regular" />
            </span>
            <span className="font-mono text-lg font-medium leading-none tabular-nums text-zinc-900">{n}</span>
            <span className="text-[11px] leading-tight text-zinc-500">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
