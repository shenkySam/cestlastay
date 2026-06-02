import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { IBooking, IRoom, BookingStatus, RoomStatus } from '@shared/index';
import { format } from 'date-fns';

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

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const available = rooms.filter((r) => r.status === RoomStatus.AVAILABLE).length;
  const occupied = rooms.filter((r) => r.status === RoomStatus.OCCUPIED).length;
  const cleaning = rooms.filter((r) => r.status === RoomStatus.CLEANING).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Good day, {user?.firstName}
        </h2>
        <p className="text-gray-500 text-sm mt-1">Front desk operations overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Pending Check-ins', value: todayCheckIns.length, icon: '📥' },
          { label: 'Pending Check-outs', value: todayCheckOuts.length, icon: '📤' },
          { label: 'Available Rooms', value: available, icon: '🛏' },
          { label: 'Occupied Rooms', value: occupied, icon: '🔑' },
          { label: 'Rooms Cleaning', value: cleaning, icon: '🧹' },
          { label: 'Total Rooms', value: rooms.length, icon: '🏨' },
        ].map((stat) => (
          <div key={stat.label} className="card p-5">
            <span className="text-2xl">{stat.icon}</span>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {todayCheckIns.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Today's Check-ins</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Booking #', 'Guest', 'Room', 'Date', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {todayCheckIns.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-blue-700">{b.bookingNumber}</td>
                  <td className="px-4 py-2">{b.guest?.firstName} {b.guest?.lastName}</td>
                  <td className="px-4 py-2">#{b.room?.roomNumber}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {format(new Date(b.checkInDate), 'dd MMM yyyy')}
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
