import { ReactNode } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { ArrowUpRightIcon, PlusIcon } from '@phosphor-icons/react';
import { riseItem, Skeleton } from '@/components/admin/ui';
import { LiveClock } from './LiveClock';
import { MagneticLink } from './MagneticLink';
import { plural } from './selectors';

interface DashboardHeaderProps {
  firstName?: string;
  /** null while the slices behind it are still loading */
  summary: {
    arrivals: number | null;
    departures: number | null;
    openRequests: number | null;
    turnover: number | null;
  };
}

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const Num = ({ children }: { children: ReactNode }) => (
  <span className="font-mono font-medium tabular-nums text-zinc-800">{children}</span>
);

/** Left-aligned greeting, a data-built one-line summary, clock and the two primary CTAs. */
export function DashboardHeader({ firstName, summary }: DashboardHeaderProps) {
  const now = new Date();
  const { arrivals, departures, openRequests, turnover } = summary;

  const parts: ReactNode[] = [];
  if (arrivals != null && departures != null) {
    parts.push(
      <span key="moves">
        <Num>{arrivals}</Num> {plural(arrivals, 'arrival')} and <Num>{departures}</Num>{' '}
        {plural(departures, 'departure')} today
      </span>,
    );
  }
  if (openRequests != null) {
    parts.push(
      <span key="requests">
        <Num>{openRequests}</Num> open {plural(openRequests, 'request')}
      </span>,
    );
  }
  if (turnover != null) {
    parts.push(
      <span key="turnover">
        <Num>{turnover}</Num> {plural(turnover, 'room')} in turnover
      </span>,
    );
  }
  const pending = arrivals == null && openRequests == null && turnover == null;

  return (
    <motion.header variants={riseItem} className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="eyebrow">{format(now, 'EEEE, d MMMM')}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
          {greeting(now.getHours())}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        {pending ? (
          <Skeleton className="mt-3 h-4 w-72 max-w-full rounded-full" />
        ) : (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
            {parts.map((part, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                {i > 0 && <span aria-hidden className="size-1 rounded-full bg-zinc-300" />}
                {part}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <LiveClock />
        <MagneticLink to="/staff/bookings" className="btn-primary">
          <PlusIcon size={16} weight="regular" />
          New booking
        </MagneticLink>
        <MagneticLink to="/staff" className="btn-secondary">
          <ArrowUpRightIcon size={16} weight="regular" />
          Front desk
        </MagneticLink>
      </div>
    </motion.header>
  );
}
