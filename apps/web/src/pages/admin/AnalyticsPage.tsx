import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Overview {
  rangeDays: number;
  totalRooms: number;
  occupiedNow: number;
  availableNow: number;
  occupancyRate: number;
  periodRevenue: number;
  totalBookings: number;
  totalGuests: number;
  adr: number;
  revPAR: number;
  otaRevenue: number;
  otaCommission: number;
  otaBookings: number;
}

interface DailyPoint { date: string; label: string; revenue?: number; rate?: number; occupied?: number; total?: number }

interface SourceRow {
  source: string;
  bookings: number;
  revenue: number;
  commission: number;
  netRevenue: number;
}

interface TopRoom {
  roomId: string;
  roomNumber: string;
  categoryName: string;
  bookings: number;
  revenue: number;
}

const SOURCE_LABEL: Record<string, string> = {
  DIRECT: 'Direct',
  WALK_IN: 'Walk-in',
  BOOKING_COM: 'Booking.com',
  AIRBNB: 'Airbnb',
  EXPEDIA: 'Expedia',
  AGODA: 'Agoda',
  OTHER_OTA: 'Other OTA',
};

const SOURCE_COLOR: Record<string, string> = {
  DIRECT: '#10b981',
  WALK_IN: '#06b6d4',
  BOOKING_COM: '#3b82f6',
  AIRBNB: '#ef4444',
  EXPEDIA: '#f59e0b',
  AGODA: '#8b5cf6',
  OTHER_OTA: '#6b7280',
};

const RANGE_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [revenueByDay, setRevenueByDay] = useState<DailyPoint[]>([]);
  const [occupancyByDay, setOccupancyByDay] = useState<DailyPoint[]>([]);
  const [bySource, setBySource] = useState<SourceRow[]>([]);
  const [topRooms, setTopRooms] = useState<TopRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [days]);

  async function load() {
    setLoading(true);
    try {
      const [o, r, oc, s, t] = await Promise.all([
        api.get('/analytics/overview', { params: { days } }),
        api.get('/analytics/revenue-by-day', { params: { days } }),
        api.get('/analytics/occupancy-by-day', { params: { days } }),
        api.get('/analytics/bookings-by-source', { params: { days } }),
        api.get('/analytics/top-rooms', { params: { days, limit: 5 } }),
      ]);
      setOverview(o.data);
      setRevenueByDay(r.data);
      setOccupancyByDay(oc.data);
      setBySource(s.data);
      setTopRooms(t.data);
    } finally {
      setLoading(false);
    }
  }

  const totalSourceRevenue = bySource.reduce((s, x) => s + x.revenue, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Analytics</h2>
          <p className="text-gray-500 text-sm mt-1">
            Occupancy, revenue and booking insights for the last {days} days.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setDays(r.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                days === r.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !overview ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : !overview ? (
        <div className="text-center py-12 text-gray-400">No data available.</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Occupancy Rate', value: `${overview.occupancyRate}%`, icon: '🏨' },
              { label: 'Period Revenue', value: `$${overview.periodRevenue.toFixed(2)}`, icon: '💰' },
              { label: 'ADR', value: `$${overview.adr.toFixed(2)}`, hint: 'Avg. Daily Rate', icon: '📊' },
              { label: 'RevPAR', value: `$${overview.revPAR.toFixed(2)}`, hint: 'Revenue / Available Room', icon: '📈' },
            ].map((s) => (
              <div key={s.label} className="card p-5">
                <span className="text-2xl">{s.icon}</span>
                <p className="text-2xl font-bold text-gray-900 mt-2">{s.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
                {s.hint && <p className="text-xs text-gray-400">{s.hint}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Bookings', value: overview.totalBookings, icon: '📅' },
              { label: 'Guests', value: overview.totalGuests, icon: '👤' },
              { label: 'Occupied Now', value: `${overview.occupiedNow} / ${overview.totalRooms}`, icon: '🔑' },
              { label: 'OTA Commission', value: `$${overview.otaCommission.toFixed(2)}`, icon: '✈️' },
            ].map((s) => (
              <div key={s.label} className="card p-5">
                <span className="text-2xl">{s.icon}</span>
                <p className="text-2xl font-bold text-gray-900 mt-2">{s.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Revenue chart */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Daily Revenue</h3>
            <BarChart
              data={revenueByDay.map((d) => ({ label: d.label, value: d.revenue ?? 0 }))}
              valuePrefix="$"
              barColor="#3b82f6"
            />
          </div>

          {/* Occupancy chart */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Daily Occupancy Rate</h3>
            <BarChart
              data={occupancyByDay.map((d) => ({ label: d.label, value: d.rate ?? 0 }))}
              valueSuffix="%"
              maxValue={100}
              barColor="#10b981"
            />
          </div>

          {/* Bookings by source + Top rooms */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Bookings by Source</h3>
              {bySource.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No booking data yet.</p>
              ) : (
                <div className="space-y-3">
                  {bySource.map((s) => {
                    const pct = totalSourceRevenue > 0 ? (s.revenue / totalSourceRevenue) * 100 : 0;
                    return (
                      <div key={s.source}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">
                            {SOURCE_LABEL[s.source] ?? s.source}
                            <span className="text-gray-400 font-normal"> · {s.bookings} booking{s.bookings !== 1 ? 's' : ''}</span>
                          </span>
                          <span className="text-gray-700 font-mono">${s.revenue.toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: SOURCE_COLOR[s.source] ?? '#6b7280',
                            }}
                          />
                        </div>
                        {s.commission > 0 && (
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Commission: ${s.commission.toFixed(2)}</span>
                            <span>Net: ${s.netRevenue.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Top Performing Rooms</h3>
              {topRooms.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No booking data yet.</p>
              ) : (
                <div className="space-y-3">
                  {topRooms.map((r, i) => {
                    const max = topRooms[0]?.revenue ?? 1;
                    const pct = (r.revenue / max) * 100;
                    return (
                      <div key={r.roomId}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">
                            <span className="text-gray-400 mr-2">#{i + 1}</span>
                            Room {r.roomNumber}
                            <span className="text-gray-400 font-normal"> · {r.categoryName} · {r.bookings} booking{r.bookings !== 1 ? 's' : ''}</span>
                          </span>
                          <span className="text-gray-700 font-mono">${r.revenue.toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Inline SVG bar chart ───────────────────────────────────────

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  valuePrefix?: string;
  valueSuffix?: string;
  maxValue?: number;
  barColor?: string;
}

function BarChart({ data, valuePrefix = '', valueSuffix = '', maxValue, barColor = '#3b82f6' }: BarChartProps) {
  if (data.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">No data yet.</p>;
  }
  const max = maxValue ?? Math.max(1, ...data.map((d) => d.value));
  const showLabelEvery = Math.max(1, Math.ceil(data.length / 12));

  return (
    <div className="w-full">
      <div className="flex items-end gap-1 h-48">
        {data.map((d, i) => {
          const pct = max > 0 ? (d.value / max) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div
                className="w-full rounded-t transition-all hover:opacity-80"
                style={{
                  height: `${Math.max(pct, 1)}%`,
                  backgroundColor: barColor,
                  minHeight: d.value > 0 ? 2 : 0,
                }}
                title={`${d.label}: ${valuePrefix}${d.value.toFixed(2)}${valueSuffix}`}
              />
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                {d.label}: {valuePrefix}{d.value.toFixed(2)}{valueSuffix}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            {i % showLabelEvery === 0 && (
              <span className="text-[10px] text-gray-500">{d.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
