import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { IBooking, IGuest, IRoom, BookingSource, BookingStatus } from '@shared/index';
import { roomNumbersLabel } from '@/lib/rooms';

const OTA_SOURCES: BookingSource[] = [
  BookingSource.BOOKING_COM,
  BookingSource.AIRBNB,
  BookingSource.EXPEDIA,
  BookingSource.AGODA,
  BookingSource.OTHER_OTA,
];

const SOURCE_LABEL: Record<string, string> = {
  [BookingSource.BOOKING_COM]: 'Booking.com',
  [BookingSource.AIRBNB]: 'Airbnb',
  [BookingSource.EXPEDIA]: 'Expedia',
  [BookingSource.AGODA]: 'Agoda',
  [BookingSource.OTHER_OTA]: 'Other OTA',
};

const STATUS_BADGE: Record<string, string> = {
  [BookingStatus.PENDING]: 'badge-yellow',
  [BookingStatus.CONFIRMED]: 'badge-blue',
  [BookingStatus.CHECKED_IN]: 'badge-green',
  [BookingStatus.CHECKED_OUT]: 'badge-gray',
  [BookingStatus.CANCELLED]: 'badge-red',
  [BookingStatus.NO_SHOW]: 'badge-red',
};

interface RevenueRow {
  source: string;
  bookings: number;
  grossRevenue: number;
  commission: number;
  netRevenue: number;
}

const TODAY = new Date().toISOString().split('T')[0];
const TOMORROW = new Date(Date.now() + 86400000).toISOString().split('T')[0];

const EMPTY_FORM = {
  source: BookingSource.BOOKING_COM as BookingSource,
  otaBookingId: '',
  roomIds: [] as string[],
  checkInDate: TODAY,
  checkOutDate: TOMORROW,
  numberOfGuests: 1,
  totalAmount: '',
  otaCommission: '',
  // Guest
  useExistingGuest: false,
  guestId: '',
  guestFirstName: '',
  guestLastName: '',
  guestEmail: '',
  guestPhone: '',
  specialRequests: '',
};

export default function StaffOtaBookingsPage() {
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [revenue, setRevenue] = useState<{
    totals: { bookings: number; grossRevenue: number; commission: number; netRevenue: number };
    bySource: RevenueRow[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState<string>('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [guestResults, setGuestResults] = useState<IGuest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<IGuest | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [filterSource]);

  async function load() {
    setLoading(true);
    try {
      const [bookingsRes, revenueRes] = await Promise.all([
        api.get('/ota/bookings', {
          params: { ...(filterSource && { source: filterSource }) },
        }),
        api.get('/ota/revenue'),
      ]);
      setBookings(bookingsRes.data);
      setRevenue(revenueRes.data);
    } finally {
      setLoading(false);
    }
  }

  async function openModal() {
    setForm(EMPTY_FORM);
    setSelectedGuest(null);
    setGuestSearch('');
    setGuestResults([]);
    setShowModal(true);
    if (rooms.length === 0) {
      const { data } = await api.get('/rooms');
      setRooms(data);
    }
  }

  async function searchGuests(q: string) {
    setGuestSearch(q);
    if (q.length < 2) { setGuestResults([]); return; }
    const { data } = await api.get('/guests', { params: { search: q } });
    setGuestResults(data);
  }

  function selectGuest(g: IGuest) {
    setSelectedGuest(g);
    setForm((f) => ({ ...f, guestId: g.id }));
  }

  function toggleRoom(roomId: string) {
    setForm((f) => ({
      ...f,
      roomIds: f.roomIds.includes(roomId)
        ? f.roomIds.filter((id) => id !== roomId)
        : [...f.roomIds, roomId],
    }));
  }

  async function handleSubmit() {
    if (form.roomIds.length === 0 || !form.otaBookingId) {
      toast.error('At least one room and the OTA booking ID are required');
      return;
    }
    if (form.useExistingGuest && !form.guestId) {
      toast.error('Please select a guest');
      return;
    }
    if (!form.useExistingGuest &&
        (!form.guestFirstName || !form.guestLastName || !form.guestEmail || !form.guestPhone)) {
      toast.error('Guest first/last name, email and phone are required');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        source: form.source,
        otaBookingId: form.otaBookingId.trim(),
        roomIds: form.roomIds,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        numberOfGuests: form.numberOfGuests,
        ...(form.totalAmount !== '' && { totalAmount: Number(form.totalAmount) }),
        ...(form.otaCommission !== '' && { otaCommission: Number(form.otaCommission) }),
        ...(form.specialRequests && { specialRequests: form.specialRequests }),
      };

      if (form.useExistingGuest) {
        payload.guestId = form.guestId;
      } else {
        payload.guestFirstName = form.guestFirstName;
        payload.guestLastName = form.guestLastName;
        payload.guestEmail = form.guestEmail;
        payload.guestPhone = form.guestPhone;
      }

      await api.post('/ota/bookings', payload);
      toast.success('OTA booking created');
      setShowModal(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  const wizardNights = Math.max(
    1,
    Math.ceil((new Date(form.checkOutDate).getTime() - new Date(form.checkInDate).getTime()) / 86400000),
  );

  const selectedPerNight = rooms
    .filter((r) => form.roomIds.includes(r.id))
    .reduce((sum, r) => sum + Number(r.category?.basePrice ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">OTA Bookings</h2>
          <p className="text-gray-500 text-sm mt-1">
            Manually enter bookings from external platforms (Booking.com, Airbnb, etc.)
          </p>
        </div>
        <button className="btn-primary" onClick={openModal}>+ New OTA Booking</button>
      </div>

      {/* Revenue summary */}
      {revenue && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'OTA Bookings', value: revenue.totals.bookings, icon: '✈️' },
            { label: 'Gross Revenue', value: `$${revenue.totals.grossRevenue.toFixed(2)}`, icon: '💰' },
            { label: 'Commission', value: `$${revenue.totals.commission.toFixed(2)}`, icon: '📉' },
            { label: 'Net Revenue', value: `$${revenue.totals.netRevenue.toFixed(2)}`, icon: '✅' },
          ].map((s) => (
            <div key={s.label} className="card p-5">
              <span className="text-2xl">{s.icon}</span>
              <p className="text-2xl font-bold text-gray-900 mt-2">{s.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Revenue by source */}
      {revenue && revenue.bySource.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Revenue by Source</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Source', 'Bookings', 'Gross', 'Commission', 'Net'].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {revenue.bySource.map((row) => (
                <tr key={row.source} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{SOURCE_LABEL[row.source] ?? row.source}</td>
                  <td className="px-4 py-2">{row.bookings}</td>
                  <td className="px-4 py-2">${row.grossRevenue.toFixed(2)}</td>
                  <td className="px-4 py-2 text-red-600">−${row.commission.toFixed(2)}</td>
                  <td className="px-4 py-2 font-bold text-green-700">${row.netRevenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterSource('')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
            filterSource === ''
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          All Sources
        </button>
        {OTA_SOURCES.map((s) => (
          <button
            key={s}
            onClick={() => setFilterSource(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
              filterSource === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {SOURCE_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Bookings table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Booking #', 'OTA ID', 'Source', 'Guest', 'Room', 'Check-in', 'Total', 'Commission', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-700">{b.bookingNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.otaBookingId ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-blue">{SOURCE_LABEL[b.source] ?? b.source}</span>
                  </td>
                  <td className="px-4 py-3 font-medium">{b.guest?.firstName} {b.guest?.lastName}</td>
                  <td className="px-4 py-3">{roomNumbersLabel(b)}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {format(new Date(b.checkInDate), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 font-medium">${Number(b.totalAmount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-red-600">
                    {b.otaCommission ? `$${Number(b.otaCommission).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_BADGE[b.status] ?? 'badge-gray'}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bookings.length === 0 && (
            <div className="text-center py-12 text-gray-400">No OTA bookings yet.</div>
          )}
        </div>
      )}

      {/* ── New OTA Booking Modal ─────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 my-8">
            <h3 className="text-lg font-semibold">New OTA Booking</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
                <select
                  className="input"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value as BookingSource })}
                >
                  {OTA_SOURCES.map((s) => (
                    <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">OTA Booking ID</label>
                <input
                  className="input font-mono"
                  placeholder="e.g. BDC-12345678"
                  value={form.otaBookingId}
                  onChange={(e) => setForm({ ...form, otaBookingId: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Room{form.roomIds.length > 1 ? `s (${form.roomIds.length})` : ''}
              </label>
              <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
                {rooms.map((r) => {
                  const checked = form.roomIds.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                        checked ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRoom(r.id)}
                      />
                      <span className="font-medium">Room #{r.roomNumber}</span>
                      <span className="text-gray-500">
                        {r.category?.name} (Floor {r.floor}) · ${Number(r.category?.basePrice ?? 0).toFixed(0)}/night
                      </span>
                    </label>
                  );
                })}
              </div>
              {form.roomIds.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Rack total: ${(selectedPerNight * wizardNights).toFixed(2)} — {form.roomIds.length} room
                  {form.roomIds.length !== 1 ? 's' : ''} × {wizardNights} night{wizardNights !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Check-in</label>
                <input
                  type="date"
                  className="input"
                  value={form.checkInDate}
                  onChange={(e) => setForm({ ...form, checkInDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Check-out</label>
                <input
                  type="date"
                  className="input"
                  value={form.checkOutDate}
                  min={form.checkInDate}
                  onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Guests</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={10}
                  value={form.numberOfGuests}
                  onChange={(e) => setForm({ ...form, numberOfGuests: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Total Amount <span className="text-gray-400 font-normal">(OTA-supplied)</span>
                </label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  step="0.01"
                  placeholder={`Auto: ${wizardNights} night(s) × rate`}
                  value={form.totalAmount}
                  onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Commission <span className="text-gray-400 font-normal">(default: 15-18%)</span>
                </label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  step="0.01"
                  placeholder="Auto"
                  value={form.otaCommission}
                  onChange={(e) => setForm({ ...form, otaCommission: e.target.value })}
                />
              </div>
            </div>

            {/* Guest selector */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Guest</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, useExistingGuest: false })}
                  className={`flex-1 py-1.5 rounded-lg border text-sm font-medium ${
                    !form.useExistingGuest ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600'
                  }`}
                >
                  New Guest
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, useExistingGuest: true })}
                  className={`flex-1 py-1.5 rounded-lg border text-sm font-medium ${
                    form.useExistingGuest ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600'
                  }`}
                >
                  Existing Guest
                </button>
              </div>

              {form.useExistingGuest ? (
                <div className="space-y-2">
                  <input
                    className="input"
                    placeholder="Search by name or email…"
                    value={guestSearch}
                    onChange={(e) => searchGuests(e.target.value)}
                  />
                  {guestResults.length > 0 && (
                    <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                      {guestResults.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                            selectedGuest?.id === g.id ? 'bg-blue-100' : ''
                          }`}
                          onClick={() => selectGuest(g)}
                        >
                          <span className="font-medium">{g.firstName} {g.lastName}</span>
                          <span className="text-gray-500 ml-2">{g.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedGuest && (
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">
                      ✓ {selectedGuest.firstName} {selectedGuest.lastName} ({selectedGuest.email})
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="input"
                    placeholder="First name"
                    value={form.guestFirstName}
                    onChange={(e) => setForm({ ...form, guestFirstName: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Last name"
                    value={form.guestLastName}
                    onChange={(e) => setForm({ ...form, guestLastName: e.target.value })}
                  />
                  <input
                    className="input col-span-2"
                    placeholder="Email"
                    value={form.guestEmail}
                    onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                  />
                  <input
                    className="input col-span-2"
                    placeholder="Phone"
                    value={form.guestPhone}
                    onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Special Requests</label>
              <textarea
                className="input"
                rows={2}
                value={form.specialRequests}
                onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1" disabled={saving} onClick={handleSubmit}>
                {saving ? 'Creating…' : 'Create Booking'}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
