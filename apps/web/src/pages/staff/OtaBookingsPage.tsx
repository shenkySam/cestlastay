import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { IBooking, IGuest, IRoom, BookingSource, BookingStatus } from '@shared/index';
import { roomNumbersLabel } from '@/lib/rooms';
import { motion } from 'framer-motion';
import { AirplaneTiltIcon, CheckIcon, CoinsIcon, PercentIcon, PlusIcon, WalletIcon } from '@phosphor-icons/react';
import {
  EmptyState,
  FilterPills,
  Modal,
  ModalBody,
  ModalFooter,
  PageHeader,
  Panel,
  SOURCE_LABEL,
  SkeletonRows,
  StatTile,
  humanize,
  money,
  riseItem,
  stagger,
} from '@/components/admin/ui';
import type { SegmentOption } from '@/components/admin/ui';

const OTA_SOURCES: BookingSource[] = [
  BookingSource.BOOKING_COM,
  BookingSource.AIRBNB,
  BookingSource.EXPEDIA,
  BookingSource.AGODA,
  BookingSource.OTHER_OTA,
];

const FILTER_OPTIONS: SegmentOption<string>[] = [
  { value: '', label: 'All sources' },
  ...OTA_SOURCES.map((s) => ({ value: s, label: SOURCE_LABEL[s] })),
];

const money2 = (n: number | string | null | undefined) => money(n, { cents: true });

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
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Front desk"
        title="OTA bookings"
        description="Enter bookings that arrive from external platforms such as Booking.com and Airbnb."
        actions={
          <button type="button" className="btn-primary" onClick={openModal}>
            <PlusIcon size={16} weight="regular" aria-hidden />
            New OTA booking
          </button>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile variants={riseItem} label="OTA bookings" value={revenue?.totals.bookings ?? 0} icon={AirplaneTiltIcon} loading={!revenue} />
        <StatTile variants={riseItem} label="Gross revenue" value={revenue?.totals.grossRevenue ?? 0} format={money2} icon={CoinsIcon} loading={!revenue} />
        <StatTile variants={riseItem} label="Commission" value={revenue?.totals.commission ?? 0} format={money2} icon={PercentIcon} loading={!revenue} />
        <StatTile variants={riseItem} label="Net revenue" value={revenue?.totals.netRevenue ?? 0} format={money2} icon={WalletIcon} loading={!revenue} />
      </motion.div>

      {revenue && revenue.bySource.length > 0 && (
        <Panel eyebrow="Revenue" title="By source" flush>
          <div className="overflow-x-auto pb-3">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  {['Source', 'Bookings', 'Gross', 'Commission', 'Net'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left first:pl-6 last:pr-6 md:first:pl-8 md:last:pr-8">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {revenue.bySource.map((row) => (
                  <tr key={row.source}>
                    <td className="py-3 pl-6 pr-4 font-medium text-zinc-900 md:pl-8">{SOURCE_LABEL[row.source] ?? humanize(row.source)}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-zinc-600">{row.bookings}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-zinc-700">{money2(row.grossRevenue)}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-zinc-500">−{money2(row.commission)}</td>
                    <td className="py-3 pl-4 pr-6 font-mono font-medium tabular-nums text-zinc-950 md:pr-8">{money2(row.netRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <FilterPills
        options={FILTER_OPTIONS}
        value={filterSource}
        onChange={setFilterSource}
        layoutId="ota-source"
        aria-label="Filter by source"
      />

      <Panel flush>
        {loading && bookings.length === 0 ? (
          <SkeletonRows rows={5} avatar={false} className="px-6 md:px-8" />
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={AirplaneTiltIcon}
            title={filterSource ? `No ${SOURCE_LABEL[filterSource]} bookings` : 'No OTA bookings yet'}
            description="Add one with New OTA booking when a reservation arrives from a platform."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  {['Booking', 'OTA ID', 'Source', 'Guest', 'Room', 'Check-in', 'Total', 'Commission', 'Status'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3.5 text-left first:pl-6 last:pr-6 md:first:pl-8 md:last:pr-8">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="whitespace-nowrap py-3 pl-6 pr-4 font-mono text-xs text-lagoon-700 md:pl-8">{b.bookingNumber}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600">{b.otaBookingId ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="badge badge-blue whitespace-nowrap">{SOURCE_LABEL[b.source] ?? humanize(b.source)}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900">{b.guest?.firstName} {b.guest?.lastName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700">{roomNumbersLabel(b)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{format(new Date(b.checkInDate), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3 font-mono font-medium tabular-nums text-zinc-900">{money2(b.totalAmount)}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-zinc-500">
                      {b.otaCommission ? money2(b.otaCommission) : '—'}
                    </td>
                    <td className="py-3 pl-4 pr-6 md:pr-8">
                      <span className={`badge whitespace-nowrap ${STATUS_BADGE[b.status] ?? 'badge-gray'}`}>{humanize(b.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New OTA booking"
        description="Copy the details from the platform's confirmation."
        size="lg"
      >
        <ModalBody className="space-y-4">

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Source</label>
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
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">OTA booking ID</label>
                <input
                  className="input font-mono"
                  placeholder="e.g. BDC-12345678"
                  value={form.otaBookingId}
                  onChange={(e) => setForm({ ...form, otaBookingId: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                Room{form.roomIds.length > 1 ? `s (${form.roomIds.length})` : ''}
              </label>
              <div className="max-h-44 divide-y divide-zinc-100 overflow-y-auto rounded-2xl border border-zinc-200">
                {rooms.map((r) => {
                  const checked = form.roomIds.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className={`flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors hover:bg-zinc-50 ${
                        checked ? 'bg-lagoon-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="size-4 rounded border-zinc-300 accent-zinc-900"
                        checked={checked}
                        onChange={() => toggleRoom(r.id)}
                      />
                      <span className="font-medium text-zinc-900">Room <span className="font-mono">{r.roomNumber}</span></span>
                      <span className="truncate text-xs text-zinc-500">
                        {r.category?.name} · Floor {r.floor} · {money(r.category?.basePrice ?? 0)}/night
                      </span>
                    </label>
                  );
                })}
              </div>
              {form.roomIds.length > 0 && (
                <p className="mt-1.5 text-xs text-zinc-500">
                  Rack total <span className="font-mono tabular-nums text-zinc-700">{money2(selectedPerNight * wizardNights)}</span> · {form.roomIds.length} room
                  {form.roomIds.length !== 1 ? 's' : ''} × {wizardNights} night{wizardNights !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Check-in</label>
                <input
                  type="date"
                  className="input"
                  value={form.checkInDate}
                  onChange={(e) => setForm({ ...form, checkInDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Check-out</label>
                <input
                  type="date"
                  className="input"
                  value={form.checkOutDate}
                  min={form.checkInDate}
                  onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Guests</label>
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
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                  Total amount <span className="font-normal text-zinc-400">(from the OTA)</span>
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
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                  Commission <span className="font-normal text-zinc-400">(default 15–18%)</span>
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
            <div className="space-y-3 border-t border-zinc-100 pt-4">
              <p className="text-xs font-medium text-zinc-600">Guest</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, useExistingGuest: false })}
                  className={`flex-1 rounded-full border py-2 text-sm font-medium transition-colors ${
                    !form.useExistingGuest ? 'border-lagoon-300 bg-lagoon-50 text-lagoon-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  New guest
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, useExistingGuest: true })}
                  className={`flex-1 rounded-full border py-2 text-sm font-medium transition-colors ${
                    form.useExistingGuest ? 'border-lagoon-300 bg-lagoon-50 text-lagoon-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  Existing guest
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
                    <div className="max-h-32 overflow-y-auto rounded-2xl border border-zinc-200 p-1">
                      {guestResults.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-50 ${
                            selectedGuest?.id === g.id ? 'bg-lagoon-50 ring-1 ring-inset ring-lagoon-600/15' : ''
                          }`}
                          onClick={() => selectGuest(g)}
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
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">Special requests</label>
              <textarea
                className="input"
                rows={2}
                value={form.specialRequests}
                onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
                placeholder="Optional"
              />
            </div>

        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={saving} onClick={handleSubmit}>
            {saving ? 'Creating…' : 'Create booking'}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
