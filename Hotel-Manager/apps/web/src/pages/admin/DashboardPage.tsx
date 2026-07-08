import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { IRoom, IBooking, RoomStatus, BookingStatus } from '@shared/index';
import { roomNumbersLabel } from '@/lib/rooms';

interface Stats {
  available: number;
  occupied: number;
  checkedInToday: number;
  checkedOutToday: number;
  totalGuests: number;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<IBooking[]>([]);

  useEffect(() => {
    (async () => {
      const [roomsRes, bookingsRes, guestsRes] = await Promise.all([
        api.get('/rooms'),
        api.get('/bookings'),
        api.get('/guests'),
      ]);

      const rooms: IRoom[] = roomsRes.data;
      const bookings: IBooking[] = bookingsRes.data;
      const today = new Date().toDateString();

      setStats({
        available: rooms.filter((r) => r.status === RoomStatus.AVAILABLE).length,
        occupied: rooms.filter((r) => r.status === RoomStatus.OCCUPIED).length,
        checkedInToday: bookings.filter(
          (b) => b.actualCheckInAt && new Date(b.actualCheckInAt).toDateString() === today,
        ).length,
        checkedOutToday: bookings.filter(
          (b) => b.actualCheckOutAt && new Date(b.actualCheckOutAt).toDateString() === today,
        ).length,
        totalGuests: guestsRes.data.length,
      });

      setRecentBookings(bookings.slice(0, 5));
    })();
  }, []);

  const STATUS_BADGE: Record<BookingStatus, string> = {
    [BookingStatus.PENDING]: 'badge-yellow',
    [BookingStatus.CONFIRMED]: 'badge-blue',
    [BookingStatus.CHECKED_IN]: 'badge-green',
    [BookingStatus.CHECKED_OUT]: 'badge-gray',
    [BookingStatus.CANCELLED]: 'badge-red',
    [BookingStatus.NO_SHOW]: 'badge-red',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Welcome back, {user?.firstName}
        </h2>
        <p className="text-gray-500 text-sm mt-1">Here's what's happening at your hotel today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Available Rooms', value: stats?.available ?? '—', icon: '🛏' },
          { label: 'Occupied Rooms',  value: stats?.occupied ?? '—', icon: '🔑' },
          { label: "Check-ins Today", value: stats?.checkedInToday ?? '—', icon: '✅' },
          { label: 'Total Guests',    value: stats?.totalGuests ?? '—', icon: '👤' },
        ].map((stat) => (
          <div key={stat.label} className="card p-5">
            <span className="text-2xl">{stat.icon}</span>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {recentBookings.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Recent Bookings</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Booking #', 'Guest', 'Room', 'Check-in', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentBookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-blue-700">{b.bookingNumber}</td>
                  <td className="px-4 py-2">{b.guest?.firstName} {b.guest?.lastName}</td>
                  <td className="px-4 py-2">{roomNumbersLabel(b)}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {new Date(b.checkInDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`badge ${STATUS_BADGE[b.status as BookingStatus]}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
