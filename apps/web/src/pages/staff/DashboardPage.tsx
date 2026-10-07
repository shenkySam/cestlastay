import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BedIcon,
  BroomIcon,
  BuildingsIcon,
  CalendarBlankIcon,
  KeyIcon,
  SignInIcon,
  SignOutIcon,
} from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { IBooking, IRoom, BookingStatus, RoomStatus } from '@shared/index';
import { roomNumbersLabel } from '@/lib/rooms';
import { format } from 'date-fns';
import { EmptyState, PageHeader, Panel, Skeleton, StatTile, humanize, riseItem, stagger } from '@/components/admin/ui';

const STATUS_BADGE: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'badge-yellow',
  [BookingStatus.CONFIRMED]: 'badge-blue',
  [BookingStatus.CHECKED_IN]: 'badge-green',
  [BookingStatus.CHECKED_OUT]: 'badge-gray',
  [BookingStatus.CANCELLED]: 'badge-red',
  [BookingStatus.NO_SHOW]: 'badge-red',
};

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [todayCheckIns, setTodayCheckIns] = useState<IBooking[]>([]);
  const [todayCheckOuts, setTodayCheckOuts] = useState<IBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [roomsRes, bookingsRes] = await Promise.all([
          api.get('/rooms'),
          api.get('/bookings', { params: { status: BookingStatus.CONFIRMED } }),
        ]);
        setRooms(roomsRes.data);

        const today = new Date().toDateString();
        const bookings: IBooking[] = bookingsRes.data;
        setTodayCheckIns(
          bookings.filter((b) => new Date(b.checkInDate).toDateString() === today),
        );

        const checkedInRes = await api.get('/bookings', { params: { status: BookingStatus.CHECKED_IN } });
        setTodayCheckOuts(
          checkedInRes.data.filter(
            (b: IBooking) => new Date(b.checkOutDate).toDateString() === today,
          ),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const available = rooms.filter((r) => r.status === RoomStatus.AVAILABLE).length;
  const occupied = rooms.filter((r) => r.status === RoomStatus.OCCUPIED).length;
  const cleaning = rooms.filter((r) => r.status === RoomStatus.CLEANING).length;

  const stats = [
    { label: 'Arrivals today', value: todayCheckIns.length, icon: SignInIcon },
    { label: 'Departures today', value: todayCheckOuts.length, icon: SignOutIcon },
    { label: 'Available rooms', value: available, icon: BedIcon },
    { label: 'Occupied rooms', value: occupied, icon: KeyIcon },
    { label: 'Being cleaned', value: cleaning, icon: BroomIcon },
    { label: 'Total rooms', value: rooms.length, icon: BuildingsIcon },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow={format(new Date(), 'EEEE, d MMMM')}
        title={`Good day${user?.firstName ? `, ${user.firstName}` : ''}`}
        description="Today's arrivals, departures and room status at a glance."
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6"
      >
        {stats.map((stat) => (
          <StatTile key={stat.label} variants={riseItem} label={stat.label} value={stat.value} icon={stat.icon} loading={loading} />
        ))}
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BookingsPanel
          title="Today's arrivals"
          bookings={todayCheckIns}
          dateOf={(b) => b.checkInDate}
          loading={loading}
          empty="No confirmed arrivals for today."
        />
        <BookingsPanel
          title="Today's departures"
          bookings={todayCheckOuts}
          dateOf={(b) => b.checkOutDate}
          loading={loading}
          empty="No checked-in guests are due out today."
        />
      </div>
    </div>
  );
}

interface BookingsPanelProps {
  title: string;
  bookings: IBooking[];
  dateOf: (b: IBooking) => string | Date;
  loading: boolean;
  empty: string;
}

function BookingsPanel({ title, bookings, dateOf, loading, empty }: BookingsPanelProps) {
  return (
    <Panel
      eyebrow="Front desk"
      title={title}
      flush
      action={!loading && <span className="font-mono text-xs tabular-nums text-zinc-500">{bookings.length}</span>}
    >
      {loading ? (
        <div className="space-y-3 px-6 pb-6 md:px-8">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10 rounded-xl" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState icon={CalendarBlankIcon} title="Nothing scheduled" description={empty} compact />
      ) : (
        <div className="overflow-x-auto pb-3">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                {['Booking', 'Guest', 'Room', 'Date', 'Status'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left first:pl-6 last:pr-6 md:first:pl-8 md:last:pr-8">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="whitespace-nowrap py-3 pl-6 pr-4 font-mono text-xs text-lagoon-700 md:pl-8">{b.bookingNumber}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-900">{b.guest?.firstName} {b.guest?.lastName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">{roomNumbersLabel(b)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{format(new Date(dateOf(b)), 'dd MMM')}</td>
                  <td className="py-3 pl-4 pr-6 md:pr-8">
                    <span className={`badge whitespace-nowrap ${STATUS_BADGE[b.status as BookingStatus]}`}>{humanize(b.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
