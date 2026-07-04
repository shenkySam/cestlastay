import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { IGuest, IBooking, BookingStatus } from '@shared/index';
import { roomNumbersLabel } from '@/lib/rooms';

const STATUS_BADGE: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'badge-yellow',
  [BookingStatus.CONFIRMED]: 'badge-blue',
  [BookingStatus.CHECKED_IN]: 'badge-green',
  [BookingStatus.CHECKED_OUT]: 'badge-gray',
  [BookingStatus.CANCELLED]: 'badge-red',
  [BookingStatus.NO_SHOW]: 'badge-red',
};

export default function StaffGuestsPage() {
  const [guests, setGuests] = useState<IGuest[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IGuest | null>(null);
  const [guestBookings, setGuestBookings] = useState<IBooking[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<IGuest>>({});

  useEffect(() => { load(); }, [search]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/guests', { params: search ? { search } : {} });
      setGuests(data);
    } finally {
      setLoading(false);
    }
  }

  async function selectGuest(g: IGuest) {
    setSelected(g);
    setEditing(false);
    setForm(g);
    const { data } = await api.get(`/guests/${g.id}/bookings`);
    setGuestBookings(data);
  }

  async function handleSave() {
    if (!selected) return;
    try {
      const { data } = await api.patch(`/guests/${selected.id}`, form);
      toast.success('Guest updated');
      setSelected(data);
      setEditing(false);
      load();
    } catch {
      // errors shown by interceptor
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: guest list */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Guests</h2>
          <p className="text-gray-500 text-sm mt-1">{guests.length} guests</p>
        </div>
        <input
          className="input"
          placeholder="Search name, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
            {guests.map((g) => (
              <button
                key={g.id}
                className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                  selected?.id === g.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => selectGuest(g)}
              >
                <p className="font-medium">{g.firstName} {g.lastName}</p>
                <p className="text-gray-500 text-xs">{g.email}</p>
              </button>
            ))}
            {guests.length === 0 && (
              <p className="text-center text-gray-400 py-6">No guests found.</p>
            )}
          </div>
        )}
      </div>

      {/* Right: guest detail */}
      <div className="lg:col-span-2 space-y-5">
        {!selected ? (
          <div className="card p-8 text-center text-gray-400">Select a guest to view details.</div>
        ) : (
          <>
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {selected.firstName} {selected.lastName}
                </h3>
                <button
                  className="btn-secondary text-sm"
                  onClick={() => setEditing(!editing)}
                >
                  {editing ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {!editing ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Email', selected.email],
                    ['Phone', selected.phone],
                    ['Country', selected.country || '—'],
                    ['City', selected.city || '—'],
                    ['ID Type', selected.idType || '—'],
                    ['ID Number', selected.idNumber || '—'],
                    ['Loyalty Points', String(selected.loyaltyPoints)],
                    ['Tier', selected.loyaltyTier || 'Standard'],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-gray-500 text-xs">{label}</p>
                      <p className="font-medium">{val}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'firstName', label: 'First Name' },
                    { key: 'lastName', label: 'Last Name' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'country', label: 'Country' },
                    { key: 'city', label: 'City' },
                    { key: 'idType', label: 'ID Type' },
                    { key: 'idNumber', label: 'ID Number' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                      <input
                        className="input"
                        value={(form as any)[key] ?? ''}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <button className="btn-primary" onClick={handleSave}>Save Changes</button>
                  </div>
                </div>
              )}
            </div>

            {/* Booking history */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h4 className="font-semibold text-gray-800">Booking History</h4>
              </div>
              {guestBookings.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">No bookings.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Booking #', 'Room', 'Check-in', 'Check-out', 'Status'].map((h) => (
                        <th key={h} className="text-left px-4 py-2 text-gray-600 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {guestBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs text-blue-700">{b.bookingNumber}</td>
                        <td className="px-4 py-2">{roomNumbersLabel(b)}</td>
                        <td className="px-4 py-2 text-gray-600">
                          {format(new Date(b.checkInDate), 'dd MMM yyyy')}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {format(new Date(b.checkOutDate), 'dd MMM yyyy')}
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
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
