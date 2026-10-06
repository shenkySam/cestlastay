import { StarIcon } from '@phosphor-icons/react';
import { AnimatedNumber, EmptyState, int, Panel, riseItem, Skeleton } from '@/components/admin/ui';
import { BarList } from '@/components/admin/charts';
import type { Slice } from './useDashboardData';
import type { RatingsSummary } from './types';
import { MiniStat, TileGate, TileLink } from './parts';
import { plural } from './selectors';

interface SentimentTileProps {
  ratings: Slice<RatingsSummary>;
  className?: string;
}

const oneDecimal = (n: number) => n.toFixed(1);

function SentimentSkeleton() {
  return (
    <div aria-hidden>
      <div className="flex items-end gap-4">
        <Skeleton className="h-12 w-20 rounded-lg" />
        <div className="space-y-2 pb-1">
          <Skeleton className="h-3.5 w-24 rounded-full" />
          <Skeleton className="h-3 w-16 rounded-full" />
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-2 w-full rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function Stars({ value, size = 15 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} aria-hidden size={size} weight={i <= full ? 'fill' : 'regular'} />
      ))}
    </span>
  );
}

/** Average guest score, the 5→1 distribution and the room/service split. */
export function SentimentTile({ ratings, className }: SentimentTileProps) {
  return (
    <Panel
      variants={riseItem}
      eyebrow="Guest sentiment"
      action={<TileLink to="/admin/ratings">Ratings</TileLink>}
      className={className}
    >
      <TileGate slice={ratings} skeleton={<SentimentSkeleton />} onRetry={ratings.reload} errorTitle="Couldn't load ratings">
        {(s) => {
          const total = Number(s.totalRatings) || 0;
          if (total === 0) {
            return (
              <EmptyState
                compact
                icon={StarIcon}
                title="No reviews yet"
                description="Guests can rate their stay after check-in. Scores appear here as they come in."
              />
            );
          }
          const avg = Number(s.avgOverall) || 0;
          const items = [5, 4, 3, 2, 1].map((star) => {
            const count = Number(s.distribution?.[star] ?? 0);
            return {
              key: star,
              value: count,
              label: (
                <span className="inline-flex items-center gap-1">
                  <span className="font-mono tabular-nums text-zinc-700">{star}</span>
                  <StarIcon aria-hidden size={12} weight="fill" className="text-amber-400" />
                </span>
              ),
              display: (
                <>
                  {int(count)}
                  <span className="ml-1.5 font-normal text-zinc-400">{Math.round((count / total) * 100)}%</span>
                </>
              ),
            };
          });

          return (
            <>
              <div className="flex items-end gap-4">
                <p className="tabular-nums text-5xl font-medium leading-none tracking-tight text-zinc-950">
                  <AnimatedNumber value={avg} format={oneDecimal} />
                </p>
                <div className="pb-0.5">
                  <Stars value={avg} />
                  <p className="mt-1 text-xs text-zinc-500">
                    <span className="font-mono tabular-nums text-zinc-700">{int(total)}</span> {plural(total, 'review')}
                  </p>
                </div>
              </div>

              <BarList className="mt-6" items={items} sort={false} max={Math.max(...items.map((i) => i.value))} />

              <div className="mt-auto pt-6">
                <dl className="grid grid-cols-2 divide-x divide-zinc-100 border-t border-zinc-100 pt-5 [&>*:last-child]:pl-6">
                  <MiniStat label="Room average" value={`${oneDecimal(Number(s.avgRoom) || 0)} / 5`} />
                  <MiniStat
                    label="Service average"
                    value={Number(s.avgService) > 0 ? `${oneDecimal(Number(s.avgService))} / 5` : '—'}
                    hint={Number(s.avgService) > 0 ? undefined : 'No service ratings yet'}
                  />
                </dl>
              </div>
            </>
          );
        }}
      </TileGate>
    </Panel>
  );
}
