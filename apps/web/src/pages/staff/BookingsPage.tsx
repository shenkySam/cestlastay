import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import toast from 'react-hot-toast';
import { IBooking, IGuest, IRoom, IRoomCategory, BookingStatus, BookingSource } from '@shared/index';
import InvoiceEditor from '@/components/invoices/InvoiceEditor';
import { roomNumbersLabel } from '@/lib/rooms';
import clsx from 'clsx';
import { CalendarBlankIcon, CheckIcon, MagnifyingGlassIcon, PlusIcon, ReceiptIcon } from '@phosphor-icons/react';
import {
  EmptyState,
  FilterPills,
  Modal,
  ModalBody,
  PageHeader,
  Panel,
  SOURCE_LABEL,
  SkeletonRows,
  humanize,
  money,
} from '@/components/admin/ui';
import type { SegmentOption } from '@/components/admin/ui';

const STATUS_BADGE: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'badge-yellow',
  [BookingStatus.CONFIRMED]: 'badge-blue',
  [BookingStatus.CHECKED_IN]: 'badge-green',
  [BookingStatus.CHECKED_OUT]: 'badge-gray',
  [BookingStatus.CANCELLED]: 'badge-red',
  [BookingStatus.NO_SHOW]: 'badge-red',
};

// ── Wizard types ────────────────────────────────────────────────
type Step = 'guest' | 'dates' | 'room' | 'confirm';
const STEPS: Step[] = ['guest', 'dates', 'room', 'confirm'];

const FILTER_OPTIONS: SegmentOption<string>[] = [
  { value: '', label: 'All' },
  ...Object.values(BookingStatus).map((s) => ({ value: s, label: humanize(s) })),
];

const sourceLabel = (s: string) => SOURCE_LABEL[s] ?? humanize(s);

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
  const [selectedRooms, setSelectedRooms] = useState<IRoom[]>([]);
  const [checkIn, setCheckIn] = useState(TODAY);
  const [checkOut, setCheckOut] = useState(TOMORROW);
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [source, setSource] = useState<BookingSource>(BookingSource.DIRECT);
  const [specialRequests, setSpecialRequests] = useState('');
  const [savingBooking, setSavingBooking] = useState(false);

  const query = useDebouncedValue(search);

  useEffect(() => { load(); }, [filterStatus, query]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/bookings', {
        params: {
          ...(filterStatus && { status: filterStatus }),
          ...(query && { search: query }),
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
    setSelectedRooms([]);
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
    // Drop selections that are no longer available for the (possibly new) dates
    setSelectedRooms((prev) => prev.filter((r) => data.some((d: IRoom) => d.id === r.id)));
    const { data: cats } = await api.get('/rooms/categories');
    setCategories(cats);
  }

  function toggleRoom(room: IRoom) {
    setSelectedRooms((prev) =>
      prev.some((r) => r.id === room.id)
        ? prev.filter((r) => r.id !== room.id)
        : [...prev, room],
    );
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
        roomIds: selectedRooms.map((r) => r.id),
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests,
        source,
        specialRequests: specialRequests || undefined,
      });
      toast.success('Booking created');
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

  const selectedPerNight = selectedRooms.reduce(
    (sum, r) => sum + Number(r.category?.basePrice ?? 0),
    0,
  );
  const selectedTotal = selectedPerNight * wizardNights;

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Front desk"
        title="Bookings"
        description={loading ? 'Loading bookings…' : `${bookings.length} ${bookings.length === 1 ? 'booking' : 'bookings'}${filterStatus || search ? ' match your filters' : ''}.`}
        actions={
          <button type="button" className="btn-primary" onClick={openWizard}>
            <PlusIcon size={16} weight="regular" aria-hidden />
            New booking
          </button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterPills
          options={FILTER_OPTIONS}
          value={filterStatus}
          onChange={setFilterStatus}
          layoutId="bookings-status"
          aria-label="Filter bookings by status"
          className="min-w-0"
        />
        <div className="relative w-full shrink-0 lg:w-72">
          <MagnifyingGlassIcon size={16} weight="regular" aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            className="input pl-10"
            placeholder="Search booking # or guest…"
            aria-label="Search bookings"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Panel flush>
        {loading && bookings.length === 0 ? (
          <SkeletonRows rows={6} avatar={false} className="px-6 md:px-8" />
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={CalendarBlankIcon}
            title="No bookings found"
            description={filterStatus || search ? 'Try another status or search term.' : 'Create the first booking with New booking.'}
          />
        ) : (
          <div className={clsx('overflow-x-auto transition-opacity duration-300', loading && 'opacity-60')}>
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  {['Booking', 'Guest', 'Room', 'Check-in', 'Check-out', 'Nights', 'Total', 'Status', ''].map((h, i) => (
                    <th key={i} className="whitespace-nowrap px-4 py-3.5 text-left first:pl-6 last:pr-6 md:first:pl-8 md:last:pr-8">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="whitespace-nowrap py-3 pl-6 pr-4 font-mono text-xs text-lagoon-700 md:pl-8">{b.bookingNumber}</td>
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {b.guest?.firstName} {b.guest?.lastName}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700">{roomNumbersLabel(b)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{format(new Date(b.checkInDate), 'dd MMM yyyy')}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{format(new Date(b.checkOutDate), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-zinc-600">{nights(b)}</td>
                    <td className="px-4 py-3 font-mono font-medium tabular-nums text-zinc-900">{money(b.totalAmount, { cents: true })}</td>
                    <td className="px-4 py-3">
                      <span className={`badge whitespace-nowrap ${STATUS_BADGE[b.status as BookingStatus]}`}>{humanize(b.status)}</span>
                    </td>
                    <td className="py-3 pl-4 pr-4 text-right md:pr-6">
                      <button type="button" className="btn-ghost py-1.5" onClick={() => setFolioBooking(b)}>
                        <ReceiptIcon size={16} weight="regular" aria-hidden />
                        Folio
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ── Invoice / Folio editor ───────────────────────────────── */}
      {folioBooking && (
        <InvoiceEditor booking={folioBooking} onClose={() => setFolioBooking(null)} />
      )}

      {/* ── Booking Wizard Modal ─────────────────────────────────── */}
      <Modal open={showWizard} onClose={() => setShowWizard(false)} title="New booking" size="lg">
        <ModalBody className="space-y-5">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium">
              {STEPS.map((s, i) => {
                const current = step === s;
                const done = STEPS.indexOf(step) > i;
                return (
                  <li key={s} className="flex items-center gap-1.5" aria-current={current ? 'step' : undefined}>
                    <span
                      className={clsx(
                        'flex size-6 items-center justify-center rounded-full font-mono text-[11px]',
                        current ? 'bg-zinc-900 text-white' : done ? 'bg-lagoon-100 text-lagoon-800' : 'bg-zinc-100 text-zinc-500',
                      )}
                    >
                      {done ? <CheckIcon size={12} weight="bold" aria-hidden /> : i + 1}
                    </span>
                    <span className={current ? 'text-zinc-900' : 'text-zinc-500'}>{humanize(s)}</span>
                    {i < STEPS.length - 1 && <span aria-hidden className="mx-1 h-px w-4 bg-zinc-200" />}
                  </li>
                );
              })}
            </ol>

            {/* ── Step: Guest ─── */}
            {step === 'guest' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-900">Select or create a guest</h3>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setUseExistingGuest(true)}
                    className={`flex-1 rounded-full border py-2 text-sm font-medium transition-colors ${useExistingGuest ? 'border-lagoon-300 bg-lagoon-50 text-lagoon-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                  >
                    Existing guest
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseExistingGuest(false)}
                    className={`flex-1 rounded-full border py-2 text-sm font-medium transition-colors ${!useExistingGuest ? 'border-lagoon-300 bg-lagoon-50 text-lagoon-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                  >
                    New guest
                  </button>
                </div>

                {useExistingGuest ? (
                  <div className="space-y-2">
                    <input
                      className="input"
                      placeholder="Search by name or email…"
                      value={guestSearch}
                      onChange={(e) => searchGuests(e.target.value)}
                    />
                    {guestResults.length > 0 && (
                      <div className="max-h-40 overflow-y-auto rounded-2xl border border-zinc-200 p-1">
                        {guestResults.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-50 ${selectedGuest?.id === g.id ? 'bg-lagoon-50 ring-1 ring-inset ring-lagoon-600/15' : ''}`}
                            onClick={() => setSelectedGuest(g)}
                          >
                            <span className="font-medium">{g.firstName} {g.lastName}</span>
                            <span className="text-zinc-500 ml-2">{g.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedGuest && (
                      <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
                        <CheckIcon size={14} weight="bold" aria-hidden />
                        {selectedGuest.firstName} {selectedGuest.lastName} ({selectedGuest.email})
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'firstName', label: 'First name' },
                      { key: 'lastName', label: 'Last name' },
                      { key: 'email', label: 'Email', colSpan: true },
                      { key: 'phone', label: 'Phone', colSpan: true },
                      { key: 'country', label: 'Country' },
                      { key: 'idType', label: 'ID type' },
                    ].map(({ key, label, colSpan }) => (
                      <div key={key} className={colSpan ? 'col-span-2' : ''}>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-600">{label}</label>
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
                    type="button"
                    className="btn-primary flex-1"
                    disabled={useExistingGuest ? !selectedGuest : !newGuest.firstName || !newGuest.email || !newGuest.phone}
                    onClick={() => {
                      setStep('dates');
                    }}
                  >
                    Next: dates
                  </button>
                  <button type="button" className="btn-secondary flex-1" onClick={() => setShowWizard(false)}>Cancel</button>
                </div>
              </div>
            )}

            {/* ── Step: Dates ─── */}
            {step === 'dates' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-900">Dates and details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-600">Check-in</label>
                    <input
                      type="date"
                      className="input"
                      value={checkIn}
                      min={TODAY}
                      onChange={(e) => setCheckIn(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-600">Check-out</label>
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
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Number of guests</label>
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
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Booking source</label>
                  <select
                    className="input"
                    value={source}
                    onChange={(e) => setSource(e.target.value as BookingSource)}
                  >
                    {Object.values(BookingSource).map((s) => (
                      <option key={s} value={s}>{sourceLabel(s)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Special requests</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setStep('guest')}>Back</button>
                  <button
                    type="button"
                    className="btn-primary flex-1"
                    onClick={async () => { await loadAvailableRooms(); setStep('room'); }}
                  >
                    Next: pick rooms
                  </button>
                </div>
              </div>
            )}

            {/* ── Step: Room ─── */}
            {step === 'room' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Available rooms · {wizardNights} night{wizardNights !== 1 ? 's' : ''}
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {availableRooms.length === 0 && (
                    <p className="py-6 text-center text-sm text-zinc-500">No rooms are free for these dates.</p>
                  )}
                  {availableRooms.map((room) => {
                    const checked = selectedRooms.some((r) => r.id === room.id);
                    return (
                      <button
                        key={room.id}
                        onClick={() => toggleRoom(room)}
                        type="button"
                        aria-pressed={checked}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                          checked
                            ? 'border-lagoon-300 bg-lagoon-50 ring-1 ring-inset ring-lagoon-600/15'
                            : 'border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2 font-medium text-zinc-900">
                            <span className={`flex size-4 items-center justify-center rounded border ${
                              checked ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-transparent'
                            }`}><CheckIcon size={10} weight="bold" aria-hidden /></span>
                            Room <span className="font-mono">{room.roomNumber}</span>
                          </span>
                          <span className="font-mono text-sm font-medium tabular-nums text-zinc-900">
                            {money(Number(room.category?.basePrice ?? 0) * wizardNights)} total
                          </span>
                        </div>
                        <div className="ml-6 mt-0.5 text-xs text-zinc-500">
                          {room.category?.name} · Floor {room.floor} · ${Number(room.category?.basePrice ?? 0).toFixed(0)}/night
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-sm ring-1 ring-inset ring-zinc-200/70">
                  <span className="text-zinc-600">
                    {selectedRooms.length} room{selectedRooms.length !== 1 ? 's' : ''} selected
                  </span>
                  <span className="font-mono font-medium tabular-nums text-zinc-900">
                    {money(selectedTotal, { cents: true })} for {wizardNights} night{wizardNights !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setStep('dates')}>Back</button>
                  <button
                    type="button"
                    className="btn-primary flex-1"
                    disabled={selectedRooms.length === 0}
                    onClick={() => setStep('confirm')}
                  >
                    Review
                  </button>
                </div>
              </div>
            )}

            {/* ── Step: Confirm ─── */}
            {step === 'confirm' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-900">Review and confirm</h3>
                <div className="divide-y divide-zinc-200/70 rounded-2xl bg-zinc-50 text-sm ring-1 ring-inset ring-zinc-200/70">
                  {[
                    ['Guest', selectedGuest
                      ? `${selectedGuest.firstName} ${selectedGuest.lastName}`
                      : `${newGuest.firstName} ${newGuest.lastName} (new)`],
                    [`Room${selectedRooms.length !== 1 ? 's' : ''}`,
                      selectedRooms.map((r) => `#${r.roomNumber} · ${r.category?.name}`).join(', ')],
                    ['Check-in', format(new Date(checkIn), 'dd MMM yyyy')],
                    ['Check-out', format(new Date(checkOut), 'dd MMM yyyy')],
                    ['Nights', String(wizardNights)],
                    ['Rate', `${money(selectedPerNight)}/night`],
                    ['Total', money(selectedTotal, { cents: true })],
                    ['Source', sourceLabel(source)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
                      <span className="text-zinc-500">{label}</span>
                      <span className="text-right font-medium text-zinc-900">{value}</span>
                    </div>
                  ))}
                  {specialRequests && (
                    <div className="px-4 py-2">
                      <span className="mb-0.5 block text-xs text-zinc-500">Special requests</span>
                      <span className="text-zinc-700">{specialRequests}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setStep('room')}>Back</button>
                  <button
                    type="button"
                    className="btn-primary flex-1"
                    disabled={savingBooking}
                    onClick={handleCreateBooking}
                  >
                    {savingBooking ? 'Creating…' : 'Confirm booking'}
                  </button>
                </div>
              </div>
            )}
        </ModalBody>
      </Modal>
    </div>
  );
}
