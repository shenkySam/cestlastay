import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BedIcon,
  CalendarBlankIcon,
  ChartBarIcon,
  ChartLineUpIcon,
  CoinsIcon,
  CurrencyDollarIcon,
  DoorOpenIcon,
  GlobeIcon,
  PercentIcon,
  TrophyIcon,
  UsersIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import clsx from 'clsx';
import api from '@/lib/api';
import {
  compact,
  EmptyState,
  ErrorState,
  humanize,
  int,
  money,
  PageHeader,
  Panel,
  pct,
  riseItem,
  SegmentedControl,
  Skeleton,
  SOURCE_LABEL,
  stagger,
  StatTile,
} from '@/components/admin/ui';
import { AreaChart, BarList, ColumnChart } from '@/components/admin/charts';
import type {
  OccupancyPoint,
  Overview,
  RevenuePoint,
  SourceRow,
  TopRoom,
} from '@/components/admin/dashboard/types';
import { plural } from '@/components/admin/dashboard/selectors';

type Range = 7 | 30 | 90;

const RANGES: { value: Range; label: string }[] = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

interface AnalyticsData {
  overview: Overview;
  revenue: RevenuePoint[];
  occupancy: OccupancyPoint[];
  sources: SourceRow[];
  topRooms: TopRoom[];
}

const moneyFmt = (n: number) => money(n);
const moneyAxis = (n: number) => (n >= 1000 ? `$${compact(n)}` : money(n));
const pctFmt = (n: number) => pct(n);
const pctAxis = (n: number) => `${Math.round(n)}%`;

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState<Range>(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async (range: Range) => {
    const id = ++seq.current;
    setLoading(true);
    setError(false);
    try {
      const params = { days: range };
      const [o, r, oc, s, t] = await Promise.all([
        api.get<Overview>('/analytics/overview', { params }),
        api.get<RevenuePoint[]>('/analytics/revenue-by-day', { params }),
        api.get<OccupancyPoint[]>('/analytics/occupancy-by-day', { params }),
        api.get<SourceRow[]>('/analytics/bookings-by-source', { params }),
        api.get<TopRoom[]>('/analytics/top-rooms', { params: { ...params, limit: 5 } }),
      ]);
      if (id !== seq.current) return;
      setData({ overview: o.data, revenue: r.data, occupancy: oc.data, sources: s.data, topRooms: t.data });
    } catch {
      if (id === seq.current) setError(true);
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  // Ignore responses that land after the page unmounts.
  useEffect(
    () => () => {
      seq.current += 1;
    },
    [],
  );

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={riseItem}>
        <PageHeader
          eyebrow="Overview"
          title="Analytics"
          description={
            <>
              Revenue, occupancy and booking mix for the last <Mono>{days}</Mono> days.
            </>
          }
          actions={
            <SegmentedControl
              options={RANGES}
              value={days}
              onChange={setDays}
              layoutId="analytics-range"
              aria-label="Date range"
            />
          }
        />
      </motion.div>

      {error && (
        <ErrorState
          title={data ? "Couldn't refresh analytics" : "Couldn't load analytics"}
          message={data ? 'Showing the last figures that loaded. Check your connection, then try again.' : undefined}
          onRetry={() => void load(days)}
        />
      )}

      {data ? (
        <div className="relative">
          <AnimatePresence>
            {loading && (
              <motion.div
                key="refresh"
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-x-0 -top-3.5 h-0.5 overflow-hidden rounded-full bg-lagoon-100"
              >
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-lagoon-500/70 to-transparent" />
              </motion.div>
            )}
          </AnimatePresence>
          <AnalyticsContent data={data} days={days} refreshing={loading} />
        </div>
      ) : (
        !error && <AnalyticsSkeleton />
      )}
    </motion.div>
  );
}

function AnalyticsContent({ data, days, refreshing }: { data: AnalyticsData; days: number; refreshing: boolean }) {
  const o = data.overview;
  const revenue = data.revenue.map((d) => ({ label: d.label, value: Number(d.revenue) || 0 }));
  const occupancy = data.occupancy.map((d) => ({ label: d.label, value: Number(d.rate) || 0 }));
  const hasRevenue = revenue.some((d) => d.value > 0);
  const hasOccupancy = occupancy.some((d) => d.value > 0);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      aria-busy={refreshing}
      className={clsx('space-y-4 transition-opacity duration-300 md:space-y-5', refreshing && 'opacity-60')}
    >
      {/* Lead KPI is wider: an asymmetric row, never four equal boxes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <StatTile
          variants={riseItem}
          emphasis
          label="Period revenue"
          value={Number(o.periodRevenue) || 0}
          format={moneyFmt}
          icon={CurrencyDollarIcon}
          hint={
            <>
              Completed payments, last <Mono>{days}</Mono> days
            </>
          }
        />
        <StatTile
          variants={riseItem}
          label="Occupancy rate"
          value={Number(o.occupancyRate) || 0}
          format={pctFmt}
          icon={BedIcon}
          hint="Room-nights sold"
        />
        <StatTile
          variants={riseItem}
          label="ADR"
          value={Number(o.adr) || 0}
          format={moneyFmt}
          icon={CoinsIcon}
          hint="Average daily rate"
        />
        <StatTile
          variants={riseItem}
          label="RevPAR"
          value={Number(o.revPAR) || 0}
          format={moneyFmt}
          icon={ChartLineUpIcon}
          hint="Per available room"
        />
      </div>

      <Panel variants={riseItem} flush className="overflow-hidden">
        <dl className="grid grid-cols-2 gap-px bg-zinc-100 lg:grid-cols-4">
          <StripStat
            icon={CalendarBlankIcon}
            label="Bookings"
            value={int(o.totalBookings)}
            hint={
              <>
                Staying in the last <Mono>{days}</Mono> days
              </>
            }
          />
          <StripStat icon={UsersIcon} label="Guests" value={int(o.totalGuests)} hint="On file" />
          <StripStat
            icon={DoorOpenIcon}
            label="Occupied now"
            value={
              <>
                {int(o.occupiedNow)}
                <span className="text-zinc-400"> / {int(o.totalRooms)}</span>
              </>
            }
            hint={
              <>
                <Mono>{int(o.availableNow)}</Mono> {plural(Number(o.availableNow), 'room')} free
              </>
            }
          />
          <StripStat
            icon={PercentIcon}
            label="OTA commission"
            value={money(o.otaCommission)}
            hint={
              <>
                <Mono>{int(o.otaBookings)}</Mono> OTA {plural(Number(o.otaBookings), 'booking')}
              </>
            }
          />
        </dl>
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12">
        <Panel variants={riseItem} eyebrow={`Revenue · last ${days} days`} title="Daily revenue" className="lg:col-span-8">
          {hasRevenue ? (
            <AreaChart
              data={revenue}
              format={moneyFmt}
              axisFormat={moneyAxis}
              height={260}
              aria-label={`Daily revenue, last ${days} days. Use the arrow keys to read each day.`}
            />
          ) : (
            <EmptyState
              icon={ChartLineUpIcon}
              title="No payments in this range"
              description="Completed payments recorded on folios plot here by day."
            />
          )}
        </Panel>
        <RevenueSummary data={data} days={days} />
      </div>

      <Panel
        variants={riseItem}
        eyebrow={`Occupancy · last ${days} days`}
        title="Rooms occupied per night"
        action={
          hasOccupancy ? (
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span>
                Avg <span className="font-mono font-medium tabular-nums text-zinc-900">{pct(o.occupancyRate)}</span>
              </span>
              <span>
                Peak{' '}
                <span className="font-mono font-medium tabular-nums text-zinc-900">
                  {pct(Math.max(...occupancy.map((d) => d.value)))}
                </span>
              </span>
            </div>
          ) : undefined
        }
      >
        {hasOccupancy ? (
          <ColumnChart
            data={occupancy}
            format={pctFmt}
            axisFormat={pctAxis}
            max={100}
            height={220}
            aria-label={`Occupancy rate per night, last ${days} days. Use the arrow keys to read each night.`}
          />
        ) : (
          <EmptyState
            icon={ChartBarIcon}
            title="No occupied nights in this range"
            description="Confirmed and checked-in stays fill this chart night by night."
          />
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12">
        <Panel variants={riseItem} eyebrow="Channels" title="Bookings by source" className="lg:col-span-7">
          {data.sources.length === 0 ? (
            <EmptyState
              compact
              icon={GlobeIcon}
              title="No bookings in this range"
              description="Direct, walk-in and OTA bookings are ranked here by booked value."
            />
          ) : (
            <BarList
              items={data.sources.map((s) => {
                const commission = Number(s.commission) || 0;
                const bookings = Number(s.bookings) || 0;
                return {
                  key: s.source,
                  label: SOURCE_LABEL[s.source] ?? humanize(s.source),
                  value: Number(s.revenue) || 0,
                  display: money(s.revenue),
                  sub: (
                    <>
                      <Mono>{int(bookings)}</Mono> {plural(bookings, 'booking')}
                      {commission > 0 && (
                        <>
                          {' · '}
                          <Mono>{money(commission)}</Mono> commission{' · '}
                          <Mono>{money(s.netRevenue)}</Mono> net
                        </>
                      )}
                    </>
                  ),
                };
              })}
            />
          )}
        </Panel>

        <Panel variants={riseItem} eyebrow="Rooms" title="Top performing rooms" className="lg:col-span-5">
          {data.topRooms.length === 0 ? (
            <EmptyState
              compact
              icon={TrophyIcon}
              title="No booked rooms in this range"
              description="Rooms rank here by their share of booked value once reservations come in."
            />
          ) : (
            <BarList
              items={data.topRooms.map((r, i) => ({
                key: r.roomId,
                label: (
                  <span className="inline-flex items-center gap-2">
                    <span className="font-mono text-xs tabular-nums text-zinc-400">{i + 1}</span>
                    Room <span className="font-mono tabular-nums text-zinc-900">{r.roomNumber}</span>
                  </span>
                ),
                value: Number(r.revenue) || 0,
                display: money(r.revenue),
                sub: (
                  <>
                    {r.categoryName} · <Mono>{int(r.bookings)}</Mono> {plural(Number(r.bookings), 'booking')}
                  </>
                ),
              }))}
            />
          )}
        </Panel>
      </div>
    </motion.div>
  );
}

function RevenueSummary({ data, days }: { data: AnalyticsData; days: number }) {
  const o = data.overview;
  const total = Number(o.periodRevenue) || 0;
  const series = data.revenue.map((d) => ({ label: d.label, value: Number(d.revenue) || 0 }));
  const best = series.reduce<{ label: string; value: number } | null>(
    (top, d) => (d.value > (top?.value ?? 0) ? d : top),
    null,
  );
  const paidDays = series.filter((d) => d.value > 0).length;

  const rows: { label: string; value: ReactNode; hint?: ReactNode }[] = [
    { label: 'Daily average', value: money(series.length ? total / series.length : 0) },
    {
      label: 'Best day',
      value: best ? money(best.value) : '—',
      hint: best ? <Mono>{best.label}</Mono> : 'No payments yet',
    },
    {
      label: 'Days with payments',
      value: (
        <>
          {paidDays}
          <span className="text-zinc-400"> / {series.length || days}</span>
        </>
      ),
    },
    {
      label: 'OTA booked value',
      value: money(o.otaRevenue),
      hint: (
        <>
          <Mono>{int(o.otaBookings)}</Mono> {plural(Number(o.otaBookings), 'booking')}
        </>
      ),
    },
  ];

  return (
    <Panel variants={riseItem} eyebrow="Summary" title="Where it came from" className="lg:col-span-4">
      <dl className="-my-3 divide-y divide-zinc-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-3.5">
            <dt className="text-sm text-zinc-500">
              {row.label}
              {row.hint && <span className="mt-0.5 block text-[11px] text-zinc-400">{row.hint}</span>}
            </dt>
            <dd className="shrink-0 font-mono text-base font-medium tabular-nums text-zinc-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function StripStat({ icon: IconCmp, label, value, hint }: { icon: Icon; label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="bg-white px-6 py-5 md:px-8">
      <dt className="eyebrow flex items-center gap-1.5">
        <IconCmp size={14} weight="regular" className="text-zinc-400" />
        {label}
      </dt>
      <dd className="mt-2 font-mono text-xl font-medium tabular-nums tracking-tight text-zinc-900">{value}</dd>
      {hint && <dd className="mt-1 text-xs text-zinc-500">{hint}</dd>}
    </div>
  );
}

const Mono = ({ children }: { children: ReactNode }) => (
  <span className="font-mono tabular-nums text-zinc-600">{children}</span>
);

function AnalyticsSkeleton() {
  return (
    <div role="status" aria-label="Loading analytics" className="space-y-4 md:space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <StatTile loading emphasis label="Period revenue" value={0} />
        <StatTile loading label="Occupancy rate" value={0} />
        <StatTile loading label="ADR" value={0} />
        <StatTile loading label="RevPAR" value={0} />
      </div>
      <Panel flush className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-zinc-100 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 bg-white px-6 py-5 md:px-8">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <Skeleton className="h-3 w-32 rounded-full" />
          <Skeleton className="mt-6 h-[260px] w-full rounded-2xl" />
        </Panel>
        <Panel className="lg:col-span-4">
          <Skeleton className="h-3 w-24 rounded-full" />
          <div className="mt-6 space-y-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <Skeleton className="h-3 w-28 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel>
        <Skeleton className="h-3 w-40 rounded-full" />
        <Skeleton className="mt-6 h-[220px] w-full rounded-2xl" />
      </Panel>
    </div>
  );
}
