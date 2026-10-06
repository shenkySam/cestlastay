import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { int, money, stagger } from '@/components/admin/ui';
import { useDashboardData } from '@/components/admin/dashboard/useDashboardData';
import { DashboardHeader } from '@/components/admin/dashboard/DashboardHeader';
import { KpiMarquee, KpiItem } from '@/components/admin/dashboard/KpiMarquee';
import { RevenueTile } from '@/components/admin/dashboard/RevenueTile';
import { OccupancyTile } from '@/components/admin/dashboard/OccupancyTile';
import { TodayTile } from '@/components/admin/dashboard/TodayTile';
import { RoomBoardTile } from '@/components/admin/dashboard/RoomBoardTile';
import { ServiceQueueTile } from '@/components/admin/dashboard/ServiceQueueTile';
import { SentimentTile } from '@/components/admin/dashboard/SentimentTile';
import { RecentBookingsTile } from '@/components/admin/dashboard/RecentBookingsTile';
import { ChannelMixTile } from '@/components/admin/dashboard/ChannelMixTile';
import { openRequests, roomsInTurnover, todaysMovements } from '@/components/admin/dashboard/selectors';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const d = useDashboardData();
  const { overview30, rooms, bookings, services, ratingsSummary } = d;

  const summary = useMemo(() => {
    const moves = bookings.data ? todaysMovements(bookings.data) : null;
    return {
      arrivals: moves ? moves.arrivals.length : null,
      departures: moves ? moves.departures.length : null,
      openRequests: services.data ? openRequests(services.data).length : null,
      turnover: rooms.data ? roomsInTurnover(rooms.data) : null,
    };
  }, [bookings.data, services.data, rooms.data]);

  const kpis = useMemo<KpiItem[]>(() => {
    const o = overview30.data;
    const r = ratingsSummary.data;
    const dash = '—';
    return [
      { label: 'ADR', value: o ? money(o.adr) : dash },
      { label: 'RevPAR', value: o ? money(o.revPAR) : dash },
      { label: 'Bookings (30d)', value: o ? int(o.totalBookings) : dash },
      { label: 'Guests', value: o ? int(o.totalGuests) : dash },
      { label: 'OTA commission', value: o ? money(o.otaCommission) : dash },
      {
        label: 'Avg rating',
        value: r ? (Number(r.totalRatings) > 0 ? `${Number(r.avgOverall).toFixed(1)} / 5` : 'No reviews') : dash,
      },
      { label: 'Rooms in turnover', value: summary.turnover != null ? int(summary.turnover) : dash },
      { label: 'Open requests', value: summary.openRequests != null ? int(summary.openRequests) : dash },
    ];
  }, [overview30.data, ratingsSummary.data, summary.turnover, summary.openRequests]);

  const retryRevenue = () => void d.refetch(['overview30', 'overview60', 'revenueByDay']);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 md:space-y-6">
      <DashboardHeader firstName={user?.firstName} summary={summary} />

      <KpiMarquee items={kpis} loading={!overview30.data && overview30.loading} />

      {/* Bento: zig-zag 8/4 · 5/7 · 7/5 · 8/4 on lg, two columns on md, one on mobile */}
      <motion.div
        variants={stagger}
        className="grid grid-cols-1 gap-4 md:grid-flow-row-dense md:grid-cols-2 md:gap-5 lg:grid-cols-12"
      >
        <RevenueTile
          className="md:col-span-2 lg:col-span-8"
          overview30={overview30}
          overview60={d.overview60}
          revenueByDay={d.revenueByDay}
          onRetry={retryRevenue}
        />
        <OccupancyTile className="lg:col-span-4" rooms={rooms} overview30={overview30} housekeeping={d.housekeeping} />

        <TodayTile className="lg:col-span-5" bookings={bookings} lastEvent={d.lastEvent} />
        <RoomBoardTile className="md:col-span-2 lg:col-span-7" rooms={rooms} />

        <ServiceQueueTile className="md:col-span-2 lg:col-span-7" services={services} />
        <SentimentTile className="lg:col-span-5" ratings={ratingsSummary} />

        <RecentBookingsTile className="md:col-span-2 lg:col-span-8" bookings={bookings} />
        <ChannelMixTile className="lg:col-span-4" bySource={d.bySource} />
      </motion.div>
    </motion.div>
  );
}
