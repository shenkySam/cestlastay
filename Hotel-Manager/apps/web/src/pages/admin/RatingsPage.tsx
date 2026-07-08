import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';

interface RatingSummary {
  totalRatings: number;
  avgOverall: number;
  avgRoom: number;
  avgService: number;
  distribution: Record<string, number>;
}

interface RatingItem {
  id: string;
  overallRating: number;
  roomRating: number;
  comment?: string | null;
  createdAt: string;
  guest: { firstName: string; lastName: string; email: string };
  booking: {
    bookingNumber: string;
    checkInDate: string;
    checkOutDate: string;
    rooms: { room: { roomNumber: string } }[];
  };
}

function Stars({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-sm' : 'text-lg';
  return (
    <span className={cls}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= Math.round(value) ? 'text-yellow-400' : 'text-gray-200'}>
          ★
        </span>
      ))}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function RatingsPage() {
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 10;

  useEffect(() => {
    api.get('/ratings/summary').then(({ data }) => setSummary(data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get('/ratings', { params: { page, limit: LIMIT } })
      .then(({ data }) => {
        setRatings(data.ratings);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Guest Ratings</h2>
        <p className="text-gray-500 text-sm mt-1">Feedback submitted by guests during or after their stay</p>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Ratings" value={summary.totalRatings} />
          <StatCard
            label="Overall Score"
            value={summary.avgOverall ? `${summary.avgOverall} / 5` : '—'}
            sub={summary.avgOverall ? '★'.repeat(Math.round(summary.avgOverall)) : undefined}
          />
          <StatCard
            label="Room Score"
            value={summary.avgRoom ? `${summary.avgRoom} / 5` : '—'}
          />
          <StatCard
            label="Service Score"
            value={summary.avgService ? `${summary.avgService} / 5` : '—'}
            sub="From service requests"
          />
        </div>
      )}

      {/* Distribution bar chart */}
      {summary && summary.totalRatings > 0 && (
        <div className="card p-5 space-y-3">
          <p className="text-sm font-medium text-gray-700">Rating Distribution (Overall)</p>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.distribution[star] ?? 0;
            const pct = summary.totalRatings > 0 ? (count / summary.totalRatings) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-4 text-right text-gray-600 font-medium">{star}</span>
                <span className="text-yellow-400 text-xs">★</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-yellow-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right text-gray-400 text-xs">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Ratings list */}
      <div className="card divide-y divide-gray-100">
        {loading ? (
          <div className="py-10 text-center text-gray-400">Loading...</div>
        ) : ratings.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <p className="text-3xl mb-2">⭐</p>
            <p>No ratings yet.</p>
          </div>
        ) : (
          ratings.map((r) => (
            <div key={r.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">
                    {r.guest.firstName} {r.guest.lastName}
                    <span className="text-gray-400 font-normal text-sm ml-2">{r.guest.email}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Booking {r.booking.bookingNumber} · Room{' '}
                    {r.booking.rooms.map((br) => br.room.roomNumber).join(', ')} ·{' '}
                    {format(new Date(r.booking.checkInDate), 'dd MMM')}–
                    {format(new Date(r.booking.checkOutDate), 'dd MMM yyyy')}
                  </p>
                </div>
                <p className="text-xs text-gray-400 shrink-0">
                  {format(new Date(r.createdAt), 'dd MMM yyyy')}
                </p>
              </div>

              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Overall</p>
                  <Stars value={r.overallRating} size="sm" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Room</p>
                  <Stars value={r.roomRating} size="sm" />
                </div>
              </div>

              {r.comment && (
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 italic">
                  "{r.comment}"
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Showing {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            <button
              className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
