import { motion, useReducedMotion } from 'framer-motion';
import { GlobeIcon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { EmptyState, humanize, int, money, Panel, riseItem, Skeleton, SOURCE_LABEL, spring } from '@/components/admin/ui';
import { BarList } from '@/components/admin/charts';
import type { Slice } from './useDashboardData';
import type { SourceRow } from './types';
import { TileGate } from './parts';
import { OTA_SOURCES, plural } from './selectors';

interface ChannelMixTileProps {
  bySource: Slice<SourceRow[]>;
  className?: string;
}

function MixSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-3 w-full rounded-full" />
      <div className="mt-3 flex gap-6">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-3 w-16 rounded-full" />
      </div>
      <div className="mt-7 space-y-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-2/3 rounded-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Direct vs OTA share of booked value, then every source as a sorted single-hue bar. */
export function ChannelMixTile({ bySource, className }: ChannelMixTileProps) {
  return (
    <Panel variants={riseItem} eyebrow="Channel mix · 30 days" className={className}>
      <TileGate slice={bySource} skeleton={<MixSkeleton />} onRetry={bySource.reload} errorTitle="Couldn't load channels">
        {(rows) => {
          const sources = rows.map((r) => ({
            ...r,
            bookings: Number(r.bookings) || 0,
            revenue: Number(r.revenue) || 0,
            commission: Number(r.commission) || 0,
          }));
          if (sources.every((s) => s.bookings === 0)) {
            return (
              <EmptyState
                compact
                icon={GlobeIcon}
                title="No bookings in the last 30 days"
                description="The split between direct and OTA channels fills in as reservations arrive."
              />
            );
          }

          // Share of booked value; fall back to booking count when nothing is priced yet.
          const byValue = sources.some((s) => s.revenue > 0);
          const measure = (s: (typeof sources)[number]) => (byValue ? s.revenue : s.bookings);
          const ota = sources.filter((s) => OTA_SOURCES.includes(s.source)).reduce((sum, s) => sum + measure(s), 0);
          const all = sources.reduce((sum, s) => sum + measure(s), 0);
          const otaShare = all > 0 ? (ota / all) * 100 : 0;

          return (
            <>
              <SplitBar direct={100 - otaShare} ota={otaShare} />
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-600">
                <li className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2.5 rounded-sm bg-lagoon-600" />
                  Direct
                  <span className="font-mono font-medium tabular-nums text-zinc-900">{Math.round(100 - otaShare)}%</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2.5 rounded-sm bg-zinc-300" />
                  OTA
                  <span className="font-mono font-medium tabular-nums text-zinc-900">{Math.round(otaShare)}%</span>
                </li>
                <li className="text-zinc-400">{byValue ? 'of booked value' : 'of bookings'}</li>
              </ul>

              <BarList
                className="mt-6 border-t border-zinc-100 pt-5"
                items={sources.map((s) => ({
                  key: s.source,
                  label: SOURCE_LABEL[s.source] ?? humanize(s.source),
                  value: measure(s),
                  display: byValue ? money(s.revenue) : int(s.bookings),
                  sub: (
                    <>
                      <span className="font-mono tabular-nums text-zinc-600">{s.bookings}</span>{' '}
                      {plural(s.bookings, 'booking')}
                      {s.commission > 0 && (
                        <>
                          {' · '}
                          <span className="font-mono tabular-nums text-zinc-600">{money(s.commission)}</span> commission
                        </>
                      )}
                    </>
                  ),
                }))}
              />
            </>
          );
        }}
      </TileGate>
    </Panel>
  );
}

/** Two segments, lagoon (direct) and zinc-300 (OTA), with a 2px surface gap. */
function SplitBar({ direct, ota }: { direct: number; ota: number }) {
  const reduce = useReducedMotion();
  const segments = [
    { key: 'direct', share: direct, className: 'bg-lagoon-600 origin-left' },
    { key: 'ota', share: ota, className: 'bg-zinc-300 origin-right' },
  ].filter((s) => s.share > 0.5);

  return (
    <div
      role="img"
      aria-label={`Direct ${Math.round(direct)}%, OTA ${Math.round(ota)}%`}
      className="flex h-3 w-full gap-0.5"
    >
      {segments.map((s, i) => (
        <motion.div
          key={s.key}
          className={clsx(
            'h-full',
            s.className,
            segments.length === 1
              ? 'rounded-full'
              : i === 0
                ? 'rounded-l-full rounded-r-[3px]'
                : 'rounded-l-[3px] rounded-r-full',
          )}
          style={{ flex: `${s.share} 1 0%` }}
          initial={{ scaleX: reduce ? 1 : 0 }}
          animate={{ scaleX: 1 }}
          transition={{ ...spring, delay: reduce ? 0 : 0.15 + i * 0.08 }}
        />
      ))}
    </div>
  );
}
