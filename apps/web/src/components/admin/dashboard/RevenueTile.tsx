import { CurrencyDollarIcon } from '@phosphor-icons/react';
import {
  AnimatedNumber,
  compact,
  DeltaPill,
  deltaPct,
  EmptyState,
  money,
  Panel,
  riseItem,
  Skeleton,
} from '@/components/admin/ui';
import { AreaChart } from '@/components/admin/charts';
import type { Slice } from './useDashboardData';
import type { Overview, RevenuePoint } from './types';
import { MiniStat, TileGate, TileLink } from './parts';
import { plural } from './selectors';

interface RevenueTileProps {
  overview30: Slice<Overview>;
  overview60: Slice<Overview>;
  revenueByDay: Slice<RevenuePoint[]>;
  onRetry: () => void;
  className?: string;
}

const moneyAxis = (n: number) => (n >= 1000 ? `$${compact(n)}` : money(n));
const moneyFmt = (n: number) => money(n);

function RevenueSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-11 w-52 rounded-lg" />
      <Skeleton className="mt-6 h-[220px] w-full rounded-2xl" />
      <div className="mt-6 grid grid-cols-3 gap-6 border-t border-zinc-100 pt-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-14 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 30-day revenue headline, delta vs the prior 30 days, daily area chart and unit economics. */
export function RevenueTile({ overview30, overview60, revenueByDay, onRetry, className }: RevenueTileProps) {
  const gate = {
    data: overview30.data && revenueByDay.data ? { o: overview30.data, days: revenueByDay.data } : null,
    loading: overview30.loading || revenueByDay.loading,
    error: overview30.error || revenueByDay.error,
  };

  return (
    <Panel
      variants={riseItem}
      eyebrow="Revenue · last 30 days"
      action={<TileLink to="/admin/analytics">Analytics</TileLink>}
      className={className}
    >
      <TileGate slice={gate} skeleton={<RevenueSkeleton />} onRetry={onRetry} errorTitle="Couldn't load revenue">
        {({ o, days }) => {
          const rev30 = Number(o.periodRevenue) || 0;
          const rev60 = overview60.data ? Number(overview60.data.periodRevenue) || 0 : null;
          const delta = rev60 != null ? deltaPct(rev30, Math.max(0, rev60 - rev30)) : null;
          const series = days.map((d) => ({ label: d.label, value: Number(d.revenue) || 0 }));
          const hasRevenue = series.some((d) => d.value > 0);

          return (
            <>
              <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                <p className="tabular-nums text-4xl font-medium leading-none tracking-tight text-zinc-950 md:text-5xl">
                  <AnimatedNumber value={rev30} format={moneyFmt} />
                </p>
                {delta != null && (
                  <p className="flex items-center gap-2 pb-1 text-xs text-zinc-500">
                    <DeltaPill value={delta} />
                    vs prior 30 days
                  </p>
                )}
              </div>

              {hasRevenue ? (
                <AreaChart
                  className="mt-6"
                  data={series}
                  format={moneyFmt}
                  axisFormat={moneyAxis}
                  height={220}
                  aria-label="Daily revenue, last 30 days. Use the arrow keys to read each day."
                />
              ) : (
                <EmptyState
                  compact
                  className="mt-4 rounded-2xl bg-zinc-50/60"
                  icon={CurrencyDollarIcon}
                  title="No revenue in the last 30 days"
                  description="Payments recorded on folios appear here, day by day."
                />
              )}

              <dl className="mt-6 grid grid-cols-3 divide-x divide-zinc-100 border-t border-zinc-100 pt-5 [&>*:not(:first-child)]:pl-4 md:[&>*:not(:first-child)]:pl-6">
                <MiniStat label="ADR" value={money(o.adr)} hint="Avg daily rate" />
                <MiniStat label="RevPAR" value={money(o.revPAR)} hint="Per available room" />
                <MiniStat
                  label="OTA commission"
                  value={money(o.otaCommission)}
                  hint={
                    <>
                      <span className="font-mono tabular-nums">{o.otaBookings}</span> OTA {plural(o.otaBookings, 'booking')}
                    </>
                  }
                />
              </dl>
            </>
          );
        }}
      </TileGate>
    </Panel>
  );
}
