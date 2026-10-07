import { Link } from 'react-router-dom';
import { CalendarBlankIcon } from '@phosphor-icons/react';
import { BookingStatus, IBooking } from '@shared/index';
import clsx from 'clsx';
import {
  Avatar,
  EmptyState,
  humanize,
  money,
  nights,
  Panel,
  riseItem,
  SkeletonRows,
  SOURCE_LABEL,
  stayRange,
} from '@/components/admin/ui';
import { roomNumbersLabel } from '@/lib/rooms';
import type { Slice } from './useDashboardData';
import { TileGate, TileLink } from './parts';

const STATUS_BADGE: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'badge-yellow',
  [BookingStatus.CONFIRMED]: 'badge-blue',
  [BookingStatus.CHECKED_IN]: 'badge-green',
  [BookingStatus.CHECKED_OUT]: 'badge-gray',
  [BookingStatus.CANCELLED]: 'badge-red',
  [BookingStatus.NO_SHOW]: 'badge-red',
};

const ROWS = 6;

interface RecentBookingsTileProps {
  bookings: Slice<IBooking[]>;
  className?: string;
}

/** The six newest bookings. Columns fold away on small screens instead of scrolling. */
export function RecentBookingsTile({ bookings, className }: RecentBookingsTileProps) {
  return (
    <Panel
      variants={riseItem}
      flush
      eyebrow="Bookings"
      title="Recent bookings"
      action={<TileLink to="/admin/bookings">View all</TileLink>}
      className={clsx('overflow-hidden', className)}
    >
      <TileGate
        slice={bookings}
        skeleton={<SkeletonRows rows={5} className="px-6 pb-4 md:px-8" />}
        onRetry={bookings.reload}
        errorTitle="Couldn't load bookings"
        errorClassName="mx-6 mb-6 md:mx-8"
      >
        {(list) =>
          list.length === 0 ? (
            <EmptyState
              compact
              className="px-6 pb-6"
              icon={CalendarBlankIcon}
              title="No bookings yet"
              description="Reservations from the front desk, the guest site and OTA channels land here."
              action={
                <Link to="/staff/bookings" className="btn-secondary px-3.5 py-1.5 text-[13px]">
                  Create a booking
                </Link>
              }
            />
          ) : (
            <BookingsTable rows={list.slice(0, ROWS)} />
          )
        }
      </TileGate>
    </Panel>
  );
}

function BookingsTable({ rows }: { rows: IBooking[] }) {
  return (
    <div className="relative overflow-x-auto pb-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left">
            <th scope="col" className="w-full py-3 pl-6 pr-3 font-medium md:pl-8">
              Guest
            </th>
            <th scope="col" className="hidden px-3 py-3 font-medium xl:table-cell">
              Stay
            </th>
            <th scope="col" className="hidden px-3 py-3 font-medium 2xl:table-cell">
              Source
            </th>
            <th scope="col" className="hidden px-3 py-3 text-right font-medium sm:table-cell">
              Amount
            </th>
            <th scope="col" className="py-3 pl-3 pr-6 text-right font-medium md:pr-8">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((b) => {
            const name = [b.guest?.firstName, b.guest?.lastName].filter(Boolean).join(' ') || 'Guest';
            const n = nights(b.checkInDate, b.checkOutDate);
            const amount = money(Number(b.totalAmount));
            return (
              <tr key={b.id}>
                <td className="w-full max-w-0 py-3 pl-6 pr-3 md:pl-8">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar size="sm" firstName={b.guest?.firstName} lastName={b.guest?.lastName} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900">{name}</p>
                      <p className="truncate font-mono text-[11px] tabular-nums text-zinc-500">
                        <span className="hidden text-lagoon-700 sm:inline">{b.bookingNumber} · </span>
                        {roomNumbersLabel(b)}
                        <span className="sm:hidden"> · {amount}</span>
                      </p>
                    </div>
                  </div>
                </td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-zinc-600 xl:table-cell">
                  {stayRange(b.checkInDate, b.checkOutDate)}
                  <span className="text-zinc-500">
                    {' · '}
                    <span className="font-mono tabular-nums">{n}</span>n
                  </span>
                </td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-zinc-600 2xl:table-cell">
                  {SOURCE_LABEL[b.source] ?? humanize(b.source)}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums text-zinc-900 sm:table-cell">
                  {amount}
                </td>
                <td className="whitespace-nowrap py-3 pl-3 pr-6 text-right md:pr-8">
                  <span className={`badge ${STATUS_BADGE[b.status] ?? 'badge-gray'}`}>{humanize(b.status)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
