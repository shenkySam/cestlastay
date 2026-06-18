import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import { IBooking, BookingStatus } from '@shared/index';

const STATUS_BADGE: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'badge-yellow',
  [BookingStatus.CONFIRMED]: 'badge-blue',
  [BookingStatus.CHECKED_IN]: 'badge-green',
  [BookingStatus.CHECKED_OUT]: 'badge-gray',
  [BookingStatus.CANCELLED]: 'badge-red',
  [BookingStatus.NO_SHOW]: 'badge-red',
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [filterStatus, search]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/bookings', {
        params: {
          ...(filterStatus && { status: filterStatus }),
          ...(search && { search }),
        },
      });
      setBookings(data);
    } finally {
      setLoading(false);
    }
  }

  const nights = (b: IBooking) => {
    const diff =
      new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Bookings</h2>
        <p className="text-gray-500 text-sm mt-1">{bookings.length} bookings</p>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <input
          className="input w-64"
          placeholder="Search booking # or guest name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2 flex-wrap">
          {['', ...Object.values(BookingStatus)].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                filterStatus === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Booking #', 'Guest', 'Room', 'Check-in', 'Check-out', 'Nights', 'Total', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-700">{b.bookingNumber}</td>
                  <td className="px-4 py-3 font-medium">
                    {b.guest?.firstName} {b.guest?.lastName}
                  </td>
                  <td className="px-4 py-3">#{b.room?.roomNumber}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {format(new Date(b.checkInDate), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {format(new Date(b.checkOutDate), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{nights(b)}</td>
                  <td className="px-4 py-3 font-medium">${Number(b.totalAmount).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_BADGE[b.status as BookingStatus]}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bookings.length === 0 && (
            <div className="text-center py-12 text-gray-400">No bookings found.</div>
          )}
        </div>
      )}
    </div>
  );
}
