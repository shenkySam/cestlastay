import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  CalendarBlankIcon,
  CalendarCheckIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ProhibitIcon,
  ReceiptIcon,
  SignInIcon,
  SignOutIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import api from '@/lib/api';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { IBooking, BookingStatus } from '@shared/index';
import InvoiceEditor from '@/components/invoices/InvoiceEditor';
import { roomNumbersLabel } from '@/lib/rooms';
import {
  Avatar,
  EmptyState,
  ErrorState,
  FilterPills,
  PageHeader,
  Panel,
  SkeletonRows,
  fadeItem,
  humanize,
  riseItem,
  stagger,
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

const STATUS_ICON: Record<BookingStatus, Icon> = {
  [BookingStatus.PENDING]: ClockIcon,
  [BookingStatus.CONFIRMED]: CalendarCheckIcon,
  [BookingStatus.CHECKED_IN]: SignInIcon,
  [BookingStatus.CHECKED_OUT]: SignOutIcon,
  [BookingStatus.CANCELLED]: XCircleIcon,
  [BookingStatus.NO_SHOW]: ProhibitIcon,
};

const STATUS_OPTIONS: SegmentOption<string>[] = [
  { value: '', label: 'All' },
  ...Object.values(BookingStatus).map((s) => ({ value: s, label: humanize(s) })),
];

const COLUMNS: { label: string; align?: 'right' }[] = [
  { label: 'Booking #' },
  { label: 'Guest' },
  { label: 'Room' },
  { label: 'Check-in' },
  { label: 'Check-out' },
  { label: 'Nights' },
  { label: 'Total', align: 'right' },
  { label: 'Status' },
];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [folioBooking, setFolioBooking] = useState<IBooking | null>(null);

  const query = useDebouncedValue(search);

  useEffect(() => {
    load();
  }, [filterStatus, query]);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get('/bookings', {
        params: {
          ...(filterStatus && { status: filterStatus }),
          ...(query && { search: query }),
        },
      });
      setBookings(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const nights = (b: IBooking) => {
    const diff =
      new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // First load shows a skeleton; later refetches (typing, filters) dim the rows instead.
  const initialLoad = loading && bookings.length === 0;
  const filtered = Boolean(search || filterStatus);

  return (
    <>
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Bookings"
        description="Search by booking number or guest name, filter by status, and open a folio to review charges and payments."
        actions={
          <label className="relative block w-full md:w-72">
            <span className="sr-only">Search bookings</span>
            <MagnifyingGlassIcon
              size={16}
              weight="regular"
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              className="input pl-10"
              placeholder="Booking # or guest name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        }
      />

      <Panel flush className="overflow-hidden" variants={riseItem} initial="hidden" animate="show">
        <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <FilterPills
            options={STATUS_OPTIONS}
            value={filterStatus}
            onChange={setFilterStatus}
            layoutId="bookings-status"
            aria-label="Filter bookings by status"
            className="min-w-0"
          />
          {!initialLoad && !error && (
            <p className="shrink-0 text-xs text-zinc-500">
              <span className="font-mono tabular-nums text-zinc-900">{bookings.length}</span>{' '}
              {bookings.length === 1 ? 'booking' : 'bookings'}
            </p>
          )}
        </div>

        {initialLoad ? (
          <SkeletonRows rows={8} className="px-6" />
        ) : error ? (
          <div className="p-4 md:p-6">
            <ErrorState title="Couldn't load bookings" onRetry={load} />
          </div>
        ) : bookings.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={MagnifyingGlassIcon}
              title="No bookings match"
              description="Try another booking number or guest name, or switch the status filter back to All."
              action={
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSearch('');
                    setFilterStatus('');
                  }}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={CalendarBlankIcon}
              title="No bookings yet"
              description="Bookings made on the guest site, at the front desk or imported from OTAs show up here."
              action={
                <Link to="/staff/bookings" className="btn-primary">
                  <PlusIcon size={16} weight="regular" aria-hidden />
                  Create one at the front desk
                </Link>
              }
            />
          )
        ) : (
          <div
            aria-busy={loading}
            className={clsx('relative overflow-x-auto transition-opacity duration-300', loading && 'opacity-60')}
          >
            <table className="w-full min-w-[920px] text-sm">
              <thead className="border-b border-zinc-100">
                <tr>
                  {COLUMNS.map((col, i) => (
                    <th
                      key={col.label}
                      className={clsx(
                        'whitespace-nowrap py-3 pr-4',
                        i === 0 ? 'pl-6' : 'pl-4',
                        col.align === 'right' ? 'text-right' : 'text-left',
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="py-3 pl-4 pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <motion.tbody
                variants={stagger}
                initial="hidden"
                animate="show"
                className="divide-y divide-zinc-100"
              >
                {bookings.map((b) => {
                  const StatusIcon = STATUS_ICON[b.status as BookingStatus];
                  return (
                    <motion.tr key={b.id} variants={fadeItem}>
                      <td className="whitespace-nowrap py-3 pl-6 pr-4 font-mono text-xs tabular-nums text-lagoon-700">
                        {b.bookingNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar firstName={b.guest?.firstName} lastName={b.guest?.lastName} size="sm" />
                          <span className="whitespace-nowrap font-medium text-zinc-900">
                            {b.guest?.firstName} {b.guest?.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] tabular-nums text-zinc-700">
                        {roomNumbersLabel(b)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] tabular-nums text-zinc-600">
                        {format(new Date(b.checkInDate), 'dd MMM yyyy')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] tabular-nums text-zinc-600">
                        {format(new Date(b.checkOutDate), 'dd MMM yyyy')}
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px] tabular-nums text-zinc-600">{nights(b)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-[13px] font-medium tabular-nums text-zinc-900">
                        ${Number(b.totalAmount).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`badge ${STATUS_BADGE[b.status as BookingStatus]}`}>
                          <StatusIcon size={14} weight="regular" aria-hidden />
                          {humanize(b.status)}
                        </span>
                      </td>
                      <td className="py-2 pl-4 pr-6 text-right">
                        <button
                          type="button"
                          className="btn-ghost -mr-3 whitespace-nowrap"
                          aria-label={`Folio for booking ${b.bookingNumber}`}
                          onClick={() => setFolioBooking(b)}
                        >
                          <ReceiptIcon size={16} weight="regular" aria-hidden />
                          Folio
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>

    {/* Invoice / folio editor: renders its own inline `fixed inset-0` overlay, so it sits
        outside the space-y stack (which would give it a top margin) and outside every
        motion/transformed element (which would become its containing block). */}
    {folioBooking && (
      <InvoiceEditor booking={folioBooking} onClose={() => setFolioBooking(null)} />
    )}
    </>
  );
}
