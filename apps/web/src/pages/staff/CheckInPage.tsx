import { ReactNode, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { IBooking, BookingStatus } from '@shared/index';
import { roomNumbersLabel } from '@/lib/rooms';
import { ArrowRightIcon, CheckIcon, MagnifyingGlassIcon, NoteIcon, XCircleIcon } from '@phosphor-icons/react';
import { ConfirmDialog, PageHeader, Panel, SOURCE_LABEL, humanize, money } from '@/components/admin/ui';

const STATUS_BADGE: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'badge-yellow',
  [BookingStatus.CONFIRMED]: 'badge-blue',
  [BookingStatus.CHECKED_IN]: 'badge-green',
  [BookingStatus.CHECKED_OUT]: 'badge-gray',
  [BookingStatus.CANCELLED]: 'badge-red',
  [BookingStatus.NO_SHOW]: 'badge-red',
};

export default function StaffCheckInPage() {
  const [query, setQuery] = useState('');
  const [booking, setBooking] = useState<IBooking | null>(null);
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setBooking(null);
    try {
      // search by booking number in the list
      const { data } = await api.get('/bookings', { params: { search: query.trim() } });
      if (data.length === 0) {
        toast.error('No booking found');
      } else {
        setBooking(data[0]);
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleCheckIn() {
    if (!booking) return;
    setProcessing(true);
    try {
      const { data } = await api.post(`/bookings/${booking.id}/check-in`);
      setBooking(data);
      toast.success(`${booking.guest?.firstName} checked in to room ${roomNumbersLabel(booking)}`);
    } finally {
      setProcessing(false);
    }
  }

  async function handleCheckOut() {
    if (!booking) return;
    setProcessing(true);
    try {
      const { data } = await api.post(`/bookings/${booking.id}/check-out`);
      setBooking(data);
      toast.success(`${booking.guest?.firstName} checked out — housekeeping task created`);
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel() {
    if (!booking) return;
    setProcessing(true);
    try {
      const { data } = await api.post(`/bookings/${booking.id}/cancel`);
      setBooking(data);
      toast.success('Booking cancelled');
    } finally {
      setProcessing(false);
      setConfirmCancel(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Front desk"
        title="Check in / out"
        description="Look up a booking by its number or the guest's name."
      />

      <Panel>
        <label htmlFor="checkin-search" className="eyebrow">Booking number or guest name</label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <MagnifyingGlassIcon size={16} weight="regular" aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              id="checkin-search"
              className="input pl-10"
              placeholder="e.g. BKG-20260501-0001 or John Smith"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
            />
          </div>
          <button type="button" className="btn-primary" onClick={search} disabled={searching}>
            {searching ? 'Searching…' : 'Look up'}
          </button>
        </div>
      </Panel>

      {booking && (
        <Panel bodyClassName="gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-xs text-lagoon-700">{booking.bookingNumber}</p>
              <h2 className="mt-1.5 truncate text-xl font-semibold tracking-tight text-zinc-950">
                {booking.guest?.firstName} {booking.guest?.lastName}
              </h2>
              <p className="mt-0.5 truncate text-sm text-zinc-500">{booking.guest?.email}</p>
            </div>
            <span className={`badge shrink-0 ${STATUS_BADGE[booking.status as BookingStatus]}`}>
              {humanize(booking.status)}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl bg-zinc-50/80 p-5 text-sm ring-1 ring-inset ring-zinc-200/60 sm:grid-cols-3">
            <Detail label={(booking.rooms?.length ?? 0) > 1 ? 'Rooms' : 'Room'} className="col-span-2 sm:col-span-3">
              {(booking.rooms ?? [])
                .map((r) => `#${r.room?.roomNumber} · ${r.room?.category?.name}`)
                .join(', ') || '—'}
            </Detail>
            <Detail label="Check-in">{format(new Date(booking.checkInDate), 'dd MMM yyyy')}</Detail>
            <Detail label="Check-out">{format(new Date(booking.checkOutDate), 'dd MMM yyyy')}</Detail>
            <Detail label="Guests" mono>{booking.numberOfGuests}</Detail>
            <Detail label="Total" mono>{money(booking.totalAmount, { cents: true })}</Detail>
            <Detail label="Source">{booking.source ? SOURCE_LABEL[booking.source] ?? humanize(booking.source) : '—'}</Detail>
            {booking.actualCheckInAt && (
              <Detail label="Checked in">{format(new Date(booking.actualCheckInAt), 'dd MMM yyyy, HH:mm')}</Detail>
            )}
            {booking.actualCheckOutAt && (
              <Detail label="Checked out">{format(new Date(booking.actualCheckOutAt), 'dd MMM yyyy, HH:mm')}</Detail>
            )}
          </dl>

          {booking.specialRequests && (
            <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/15">
              <NoteIcon size={16} weight="regular" aria-hidden className="mt-0.5 shrink-0 text-amber-700" />
              <span><span className="font-medium">Special requests: </span>{booking.specialRequests}</span>
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {booking.status === BookingStatus.CONFIRMED && (
              <button type="button" className="btn-primary flex-1" onClick={handleCheckIn} disabled={processing}>
                <CheckIcon size={16} weight="bold" aria-hidden />
                {processing ? 'Processing…' : 'Check in'}
              </button>
            )}
            {booking.status === BookingStatus.CHECKED_IN && (
              <button type="button" className="btn-primary flex-1" onClick={handleCheckOut} disabled={processing}>
                <ArrowRightIcon size={16} weight="bold" aria-hidden />
                {processing ? 'Processing…' : 'Check out'}
              </button>
            )}
            {[BookingStatus.CONFIRMED, BookingStatus.PENDING].includes(booking.status as BookingStatus) && (
              <button
                type="button"
                className="btn-secondary flex-1 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setConfirmCancel(true)}
                disabled={processing}
              >
                <XCircleIcon size={16} weight="regular" aria-hidden />
                Cancel booking
              </button>
            )}
          </div>
        </Panel>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this booking?"
        description={booking ? `${booking.bookingNumber} will be cancelled and its rooms released.` : undefined}
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}

interface DetailProps {
  label: string;
  mono?: boolean;
  className?: string;
  children: ReactNode;
}

function Detail({ label, mono, className, children }: DetailProps) {
  return (
    <div className={className}>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className={mono ? 'mt-0.5 font-mono font-medium tabular-nums text-zinc-900' : 'mt-0.5 font-medium text-zinc-900'}>
        {children}
      </dd>
    </div>
  );
}
