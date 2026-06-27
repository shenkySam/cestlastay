import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { IBooking, IGuest, IRoom, IRoomCategory, BookingStatus, BookingSource } from '@shared/index';
import InvoiceEditor from '@/components/invoices/InvoiceEditor';

const STATUS_BADGE: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'badge-yellow',
  [BookingStatus.CONFIRMED]: 'badge-blue',
  [BookingStatus.CHECKED_IN]: 'badge-green',
  [BookingStatus.CHECKED_OUT]: 'badge-gray',
  [BookingStatus.CANCELLED]: 'badge-red',
  [BookingStatus.NO_SHOW]: 'badge-red',
};

// ── Wizard types ────────────────────────────────────────────────
type Step = 'guest' | 'room' | 'dates' | 'confirm';

const EMPTY_GUEST = {
  firstName: '', lastName: '', email: '', phone: '',
  country: '', idType: '', idNumber: '',
};
const TODAY = new Date().toISOString().split('T')[0];
const TOMORROW = new Date(Date.now() + 86400000).toISOString().split('T')[0];

export default function StaffBookingsPage() {
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [folioBooking, setFolioBooking] = useState<IBooking | null>(null);

  // Wizard state
  const [step, setStep] = useState<Step>('guest');
  const [guestSearch, setGuestSearch] = useState('');
  const [guestResults, setGuestResults] = useState<IGuest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<IGuest | null>(null);
  const [newGuest, setNewGuest] = useState(EMPTY_GUEST);
  const [useExistingGuest, setUseExistingGuest] = useState(true);
  const [categories, setCategories] = useState<IRoomCategory[]>([]);
  const [availableRooms, setAvailableRooms] = useState<IRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<IRoom | null>(null);
  const [checkIn, setCheckIn] = useState(TODAY);
  const [checkOut, setCheckOut] = useState(TOMORROW);
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [source, setSource] = useState<BookingSource>(BookingSource.DIRECT);
  const [specialRequests, setSpecialRequests] = useState('');
  const [savingBooking, setSavingBooking] = useState(false);

  useEffect(() => { load(); }, [filterStatus, search]);

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

  // ── Wizard helpers ─────────────────────────────────────────────

  function openWizard() {
    setStep('guest');
    setSelectedGuest(null);
    setNewGuest(EMPTY_GUEST);
    setGuestSearch('');
    setGuestResults([]);
    setSelectedRoom(null);
    setCheckIn(TODAY);
    setCheckOut(TOMORROW);
    setNumberOfGuests(1);
    setSource(BookingSource.DIRECT);
    setSpecialRequests('');
    setShowWizard(true);
  }

  async function searchGuests(q: string) {
    setGuestSearch(q);
    if (q.length < 2) { setGuestResults([]); return; }
    const { data } = await api.get('/guests', { params: { search: q } });
    setGuestResults(data);
  }

  async function loadAvailableRooms() {
    const { data } = await api.get('/rooms/availability', {
      params: { checkIn, checkOut },
    });
    setAvailableRooms(data);
    const { data: cats } = await api.get('/rooms/categories');
    setCategories(cats);
  }

  async function handleCreateBooking() {
    setSavingBooking(true);
    try {
      let guestId = selectedGuest?.id;
      if (!useExistingGuest || !guestId) {
        const { data: guest } = await api.post('/guests', newGuest);
        guestId = guest.id;
      }
      await api.post('/bookings', {
        guestId,
        roomId: selectedRoom!.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests,
        source,
        specialRequests: specialRequests || undefined,
      });
      toast.success('Booking created!');
      setShowWizard(false);
      load();
    } catch {
      // errors shown by interceptor
    } finally {
      setSavingBooking(false);
    }
  }

  const nights = (b: IBooking) =>
    Math.ceil((new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime()) / 86400000);

  const wizardNights = Math.max(
    1,
    Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000),
  );

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Bookings</h2>
          <p className="text-gray-500 text-sm mt-1">{bookings.length} bookings</p>
        </div>
        <button className="btn-primary" onClick={openWizard}>+ New Booking</button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <input
          className="input w-64"
          placeholder="Search booking # or guest..."
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
                {['Booking #', 'Guest', 'Room', 'Check-in', 'Check-out', 'Nights', 'Total', 'Status', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
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
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      onClick={() => setFolioBooking(b)}
                    >
                      Folio
                    </button>
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

      {/* ── Invoice / Folio editor ───────────────────────────────── */}
      {folioBooking && (
        <InvoiceEditor booking={folioBooking} onClose={() => setFolioBooking(null)} />
      )}

      {/* ── Booking Wizard Modal ─────────────────────────────────── */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-5">
            {/* Steps indicator */}
            <div className="flex items-center gap-2 text-xs font-medium">
              {(['guest', 'room', 'dates', 'confirm'] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>{i + 1}</div>
                  <span className={step === s ? 'text-blue-700' : 'text-gray-400'}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                  {i < 3 && <span className="text-gray-300 mx-1">›</span>}
                </div>
              ))}
            </div>

            {/* ── Step: Guest ─── */}
            {step === 'guest' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">Select or Create Guest</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setUseExistingGuest(true)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${useExistingGuest ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600'}`}
                  >
                    Existing Guest
                  </button>
                  <button
                    onClick={() => setUseExistingGuest(false)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${!useExistingGuest ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600'}`}
                  >
                    New Guest
                  </button>
                </div>

                {useExistingGuest ? (
                  <div className="space-y-2">
                    <input
                      className="input"
                      placeholder="Search by name or email..."
                      value={guestSearch}
                      onChange={(e) => searchGuests(e.target.value)}
                    />
                    {guestResults.length > 0 && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                        {guestResults.map((g) => (
                          <button
                            key={g.id}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${selectedGuest?.id === g.id ? 'bg-blue-100' : ''}`}
                            onClick={() => setSelectedGuest(g)}
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
                    {[
                      { key: 'firstName', label: 'First Name' },
                      { key: 'lastName', label: 'Last Name' },
                      { key: 'email', label: 'Email', colSpan: true },
                      { key: 'phone', label: 'Phone', colSpan: true },
                      { key: 'country', label: 'Country' },
                      { key: 'idType', label: 'ID Type' },
                    ].map(({ key, label, colSpan }) => (
                      <div key={key} className={colSpan ? 'col-span-2' : ''}>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                        <input
                          className="input"
                          value={(newGuest as any)[key]}
                          onChange={(e) => setNewGuest({ ...newGuest, [key]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    className="btn-primary flex-1"
                    disabled={useExistingGuest ? !selectedGuest : !newGuest.firstName || !newGuest.email || !newGuest.phone}
                    onClick={() => {
                      setStep('dates');
                    }}
                  >
                    Next: Dates →
                  </button>
                  <button className="btn-secondary flex-1" onClick={() => setShowWizard(false)}>Cancel</button>
                </div>
              </div>
            )}

            {/* ── Step: Dates ─── */}
            {step === 'dates' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">Select Dates</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
                    <input
                      type="date"
                      className="input"
                      value={checkIn}
                      min={TODAY}
                      onChange={(e) => setCheckIn(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
                    <input
                      type="date"
                      className="input"
                      value={checkOut}
                      min={checkIn}
                      onChange={(e) => setCheckOut(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Guests</label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    max={10}
                    value={numberOfGuests}
                    onChange={(e) => setNumberOfGuests(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Booking Source</label>
                  <select
                    className="input"
                    value={source}
                    onChange={(e) => setSource(e.target.value as BookingSource)}
                  >
                    {Object.values(BookingSource).map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button className="btn-secondary flex-1" onClick={() => setStep('guest')}>← Back</button>
                  <button
                    className="btn-primary flex-1"
                    onClick={async () => { await loadAvailableRooms(); setStep('room'); }}
                  >
                    Next: Pick Room →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step: Room ─── */}
            {step === 'room' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">
                  Available Rooms — {wizardNights} night{wizardNights !== 1 ? 's' : ''}
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {availableRooms.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-6">No available rooms for selected dates.</p>
                  )}
                  {availableRooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className={`w-full text-left rounded-lg border-2 px-4 py-3 transition-colors ${
                        selectedRoom?.id === room.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Room #{room.roomNumber}</span>
                        <span className="text-blue-700 font-bold">
                          ${(Number(room.category?.basePrice ?? 0) * wizardNights).toFixed(0)} total
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {room.category?.name} · Floor {room.floor} · ${Number(room.category?.basePrice ?? 0).toFixed(0)}/night
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 pt-1">
                  <button className="btn-secondary flex-1" onClick={() => setStep('dates')}>← Back</button>
                  <button
                    className="btn-primary flex-1"
                    disabled={!selectedRoom}
                    onClick={() => setStep('confirm')}
                  >
                    Review →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step: Confirm ─── */}
            {step === 'confirm' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">Confirm Booking</h3>
                <div className="bg-gray-50 rounded-lg divide-y divide-gray-200 text-sm">
                  {[
                    ['Guest', selectedGuest
                      ? `${selectedGuest.firstName} ${selectedGuest.lastName}`
                      : `${newGuest.firstName} ${newGuest.lastName} (new)`],
                    ['Room', `#${selectedRoom?.roomNumber} — ${selectedRoom?.category?.name}`],
                    ['Check-in', format(new Date(checkIn), 'dd MMM yyyy')],
                    ['Check-out', format(new Date(checkOut), 'dd MMM yyyy')],
                    ['Nights', String(wizardNights)],
                    ['Rate', `$${Number(selectedRoom?.category?.basePrice ?? 0).toFixed(0)}/night`],
                    ['Total', `$${(Number(selectedRoom?.category?.basePrice ?? 0) * wizardNights).toFixed(2)}`],
                    ['Source', source.replace('_', ' ')],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between px-4 py-2">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                  {specialRequests && (
                    <div className="px-4 py-2">
                      <span className="text-gray-500 block text-xs mb-0.5">Special Requests</span>
                      <span className="text-gray-700">{specialRequests}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <button className="btn-secondary flex-1" onClick={() => setStep('room')}>← Back</button>
                  <button
                    className="btn-primary flex-1"
                    disabled={savingBooking}
                    onClick={handleCreateBooking}
                  >
                    {savingBooking ? 'Creating...' : 'Confirm Booking'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
