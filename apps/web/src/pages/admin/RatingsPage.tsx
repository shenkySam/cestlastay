import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { CaretLeftIcon, CaretRightIcon, QuotesIcon, StarIcon } from '@phosphor-icons/react';
import api from '@/lib/api';
import {
  AnimatedNumber,
  Avatar,
  EmptyState,
  ErrorState,
  Panel,
  PageHeader,
  Skeleton,
  SkeletonRows,
  StatTile,
  int,
  riseItem,
  spring,
  stagger,
} from '@/components/admin/ui';

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

const oneDecimal = (n: number) => n.toFixed(1);

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const filled = Math.round(value);
  const spoken = Number.isInteger(value) ? value : value.toFixed(1);
  return (
    <span role="img" aria-label={`${spoken} out of 5 stars`} className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <StarIcon
          key={s}
          size={size}
          aria-hidden
          weight={s <= filled ? 'fill' : 'regular'}
          className={s <= filled ? 'text-amber-400' : 'text-zinc-300'}
        />
      ))}
    </span>
  );
}

/** "4.6 / 5" with the score springing in; em dash when there's no score yet. */
function Score({ value, className = 'text-base' }: { value: number; className?: string }) {
  if (!value) return <span className="text-zinc-300">—</span>;
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <AnimatedNumber value={value} format={oneDecimal} />
      <span className={`font-normal text-zinc-400 ${className}`}>/ 5</span>
    </span>
  );
}

function Dot() {
  return <span aria-hidden className="size-1 shrink-0 rounded-full bg-zinc-300" />;
}

export default function RatingsPage() {
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const LIMIT = 10;

  function loadSummary() {
    setSummaryLoading(true);
    setSummaryError(false);
    api
      .get('/ratings/summary')
      .then(({ data }) => setSummary(data))
      .catch(() => setSummaryError(true))
      .finally(() => setSummaryLoading(false));
  }

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    setLoading(true);
    setListError(false);
    api
      .get('/ratings', { params: { page, limit: LIMIT } })
      .then(({ data }) => {
        setRatings(data.ratings);
        setTotal(data.total);
      })
      .catch(() => setListError(true))
      .finally(() => setLoading(false));
  }, [page, reloadKey]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const summaryPending = summaryLoading || !summary;

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Feedback"
        title="Guest ratings"
        description="Scores and comments guests submit during or after their stay."
      />

      {/* Summary */}
      {summaryError ? (
        <ErrorState title="Couldn't load the rating summary" onRetry={loadSummary} />
      ) : (
        <motion.div
          className="grid gap-4 md:grid-cols-[1fr_1.3fr]"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <StatTile
            variants={riseItem}
            emphasis
            label="Overall score"
            icon={StarIcon}
            loading={summaryPending}
            value={<Score value={summary?.avgOverall ?? 0} className="text-xl" />}
            hint={
              summary?.avgOverall ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <Stars value={summary.avgOverall} size={16} />
                  <span>
                    from <span className="font-mono tabular-nums text-zinc-700">{int(summary.totalRatings)}</span>{' '}
                    {summary.totalRatings === 1 ? 'rating' : 'ratings'}
                  </span>
                </span>
              ) : (
                'No ratings yet'
              )
            }
          />

          <Panel variants={riseItem} eyebrow="Distribution" title="Overall ratings by score">
            {summaryPending ? (
              <div role="status" aria-label="Loading" className="space-y-3.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-3 w-7 rounded-full" />
                    <Skeleton className="h-2 flex-1 rounded-full" />
                    <Skeleton className="h-3 w-6 rounded-full" />
                  </div>
                ))}
              </div>
            ) : summary.totalRatings === 0 ? (
              <EmptyState
                compact
                icon={StarIcon}
                title="No reviews yet"
                description="Guests can rate their stay after check-in."
              />
            ) : (
              <ul className="space-y-3.5">
                {[5, 4, 3, 2, 1].map((star, i) => {
                  const count = summary.distribution[star] ?? 0;
                  const share = summary.totalRatings > 0 ? count / summary.totalRatings : 0;
                  return (
                    <li key={star} className="flex items-center gap-3">
                      <span className="flex w-7 shrink-0 items-center gap-1 font-mono text-xs font-medium tabular-nums text-zinc-600">
                        {star}
                        <StarIcon size={11} weight="fill" aria-hidden className="text-amber-400" />
                        <span className="sr-only">{star === 1 ? 'star' : 'stars'}</span>
                      </span>
                      <span aria-hidden className="relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                        <motion.span
                          className="absolute inset-0 rounded-full bg-lagoon-500"
                          initial={{ x: '-100%' }}
                          animate={{ x: `${(share - 1) * 100}%` }}
                          transition={{ ...spring, delay: 0.15 + i * 0.05 }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right font-mono text-xs tabular-nums text-zinc-500">
                        {int(count)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel variants={riseItem} flush className="md:col-span-2">
            <dl className="grid divide-y divide-zinc-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              {[
                { label: 'Total ratings', value: summary ? <AnimatedNumber value={summary.totalRatings} format={int} /> : null },
                { label: 'Room score', value: summary ? <Score value={summary.avgRoom} /> : null },
                {
                  label: 'Service score',
                  value: summary ? <Score value={summary.avgService} /> : null,
                  hint: 'From service requests',
                },
              ].map((cell) => (
                <div key={cell.label} className="flex flex-col gap-2 px-6 py-5 md:px-8 md:py-6">
                  <dt className="eyebrow">{cell.label}</dt>
                  <dd className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    {summaryPending ? (
                      <Skeleton className="h-7 w-20 rounded-lg" />
                    ) : (
                      <span className="tabular-nums text-2xl font-medium tracking-tight text-zinc-950">{cell.value}</span>
                    )}
                    {cell.hint && <span className="text-xs text-zinc-500">{cell.hint}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        </motion.div>
      )}

      {/* Ratings list */}
      <Panel
        flush
        eyebrow="Reviews"
        title={
          <span className="flex items-baseline gap-2">
            Latest ratings
            {!loading && !listError && (
              <span className="font-mono text-sm font-normal tabular-nums text-zinc-400">{int(total)}</span>
            )}
          </span>
        }
      >
        {listError && (
          <div className="px-6 pb-5 md:px-8">
            <ErrorState title="Couldn't load ratings" onRetry={() => setReloadKey((k) => k + 1)} />
          </div>
        )}

        {loading ? (
          <SkeletonRows rows={5} className="mt-1 border-t border-zinc-100 px-6 md:px-8" />
        ) : ratings.length === 0 ? (
          !listError && (
            <EmptyState
              icon={StarIcon}
              className="mt-1 border-t border-zinc-100"
              title="No reviews yet"
              description="Guests can rate their stay after check-in."
            />
          )
        ) : (
          <motion.ul
            key={page}
            className="mt-1 divide-y divide-zinc-100 border-t border-zinc-100"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            {ratings.map((r) => (
              <motion.li key={r.id} variants={riseItem} className="flex items-start gap-4 px-6 py-5 md:px-8">
                <Avatar firstName={r.guest.firstName} lastName={r.guest.lastName} />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-baseline gap-x-2 font-medium text-zinc-900">
                        {r.guest.firstName} {r.guest.lastName}
                        <span className="truncate text-sm font-normal text-zinc-500">{r.guest.email}</span>
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                        <span>
                          Booking <span className="font-mono tabular-nums text-zinc-700">{r.booking.bookingNumber}</span>
                        </span>
                        <Dot />
                        <span>
                          Room{' '}
                          <span className="font-mono tabular-nums text-zinc-700">
                            {r.booking.rooms.map((br) => br.room.roomNumber).join(', ')}
                          </span>
                        </span>
                        <Dot />
                        <span className="font-mono tabular-nums">
                          {format(new Date(r.booking.checkInDate), 'dd MMM')}–
                          {format(new Date(r.booking.checkOutDate), 'dd MMM yyyy')}
                        </span>
                      </p>
                    </div>
                    <time
                      dateTime={r.createdAt}
                      className="shrink-0 font-mono text-xs tabular-nums text-zinc-500"
                    >
                      {format(new Date(r.createdAt), 'dd MMM yyyy')}
                    </time>
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <div className="flex items-center gap-2">
                      <span className="eyebrow">Overall</span>
                      <Stars value={r.overallRating} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="eyebrow">Room</span>
                      <Stars value={r.roomRating} />
                    </div>
                  </div>

                  {r.comment && (
                    <blockquote className="flex gap-2.5 rounded-2xl bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-700 ring-1 ring-inset ring-zinc-200/50">
                      <QuotesIcon size={16} weight="regular" aria-hidden className="mt-0.5 shrink-0 text-zinc-300" />
                      <p className="min-w-0">{r.comment}</p>
                    </blockquote>
                  )}
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-zinc-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <p className="text-sm text-zinc-500">
              Showing{' '}
              <span className="font-mono tabular-nums text-zinc-700">
                {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)}
              </span>{' '}
              of <span className="font-mono tabular-nums text-zinc-700">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <CaretLeftIcon size={14} weight="regular" />
                Prev
              </button>
              <span className="px-1 font-mono text-xs tabular-nums text-zinc-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <CaretRightIcon size={14} weight="regular" />
              </button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
