import { useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { IBooking, BookingStatus } from '@shared/index';
import { roomNumbersLabel } from '@/lib/rooms';

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
    if (!confirm('Cancel this booking?')) return;
    setProcessing(true);
    try {
      const { data } = await api.post(`/bookings/${booking.id}/cancel`);
      setBooking(data);
      toast.success('Booking cancelled');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Check In / Check Out</h2>
        <p className="text-gray-500 text-sm mt-1">Look up a booking by number or guest name.</p>
      </div>

      {/* Search */}
      <div className="card p-5 space-y-3">
        <label className="block text-sm font-medium text-gray-700">Booking Number or Guest Name</label>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="e.g. BKG-20260501-0001 or John Smith"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <button className="btn-primary" onClick={search} disabled={searching}>
            {searching ? 'Searching...' : 'Look Up'}
          </button>
        </div>
      </div>

      {/* Booking card */}
      {booking && (
        <div className="card p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-sm text-blue-700">{booking.bookingNumber}</p>
              <h3 className="text-xl font-bold text-gray-900 mt-0.5">
                {booking.guest?.firstName} {booking.guest?.lastName}
              </h3>
              <p className="text-gray-500 text-sm">{booking.guest?.email}</p>
            </div>
            <span className={`badge text-sm ${STATUS_BADGE[booking.status as BookingStatus]}`}>
              {booking.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Room{(booking.rooms?.length ?? 0) > 1 ? 's' : ''}</p>
              <p className="font-semibold">
                {(booking.rooms ?? [])
                  .map((r) => `#${r.room?.roomNumber} — ${r.room?.category?.name}`)
                  .join(', ') || '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Guests</p>
              <p className="font-semibold">{booking.numberOfGuests}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Check-in</p>
              <p className="font-semibold">{format(new Date(booking.checkInDate), 'dd MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Check-out</p>
              <p className="font-semibold">{format(new Date(booking.checkOutDate), 'dd MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Total Amount</p>
              <p className="font-semibold">${Number(booking.totalAmount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Source</p>
              <p className="font-semibold">{booking.source?.replace('_', ' ')}</p>
            </div>
            {booking.actualCheckInAt && (
              <div>
                <p className="text-gray-500 text-xs">Checked In At</p>
                <p className="font-semibold">{format(new Date(booking.actualCheckInAt), 'dd MMM yyyy HH:mm')}</p>
              </div>
            )}
            {booking.actualCheckOutAt && (
              <div>
                <p className="text-gray-500 text-xs">Checked Out At</p>
                <p className="font-semibold">{format(new Date(booking.actualCheckOutAt), 'dd MMM yyyy HH:mm')}</p>
              </div>
            )}
          </div>

          {booking.specialRequests && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800">
              <span className="font-medium">Special Requests: </span>{booking.specialRequests}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            {booking.status === BookingStatus.CONFIRMED && (
              <button className="btn-primary flex-1" onClick={handleCheckIn} disabled={processing}>
                {processing ? 'Processing...' : '✓ Check In'}
              </button>
            )}
            {booking.status === BookingStatus.CHECKED_IN && (
              <button className="btn-primary flex-1" onClick={handleCheckOut} disabled={processing}>
                {processing ? 'Processing...' : '→ Check Out'}
              </button>
            )}
            {[BookingStatus.CONFIRMED, BookingStatus.PENDING].includes(booking.status as BookingStatus) && (
              <button className="btn-danger flex-1" onClick={handleCancel} disabled={processing}>
                Cancel Booking
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
