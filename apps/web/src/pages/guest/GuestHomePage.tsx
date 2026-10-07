import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { differenceInCalendarDays, format, startOfToday } from 'date-fns';
import { motion } from 'framer-motion';
import type { Icon } from '@phosphor-icons/react';
import {
  ArrowUpRightIcon,
  CallBellIcon,
  CheckCircleIcon,
  CheckIcon,
  CopyIcon,
  DoorIcon,
  MoonIcon,
  ReceiptIcon,
  StarIcon,
} from '@phosphor-icons/react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { GuestBookingSummary } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { riseItem, stagger } from '@/components/admin/ui/motion';
import { nights, stayDate } from '@/components/guest/format';
import { Badge, IconTile, Pending, Skeleton } from '@/components/guest/ui';
import { Sheet, SheetBody, SheetFooter } from '@/components/guest/Sheet';
import { StarPicker } from '@/components/guest/StarRating';

type Photo = 'heroMain' | 'balcony';

// Optimized copies of the guest-site photos, shared with the sign-in page
const PHOTO_ALT: Record<Photo, string> = {
  heroMain: "Aerial view of C'est La Stay among palm trees at sunset",
  balcony: 'Balcony with a hammock and two chairs looking out over the treetops',
};

interface Action {
  label: string;
  description: string;
  icon: Icon;
  href: string;
}

const ACTIONS: Action[] = [
  {
    label: 'Requests & Complaints',
    description: 'Room service, laundry, repairs and more',
    icon: CallBellIcon,
    href: '/guest/services',
  },
  {
    label: 'View My Bill',
    description: 'Charges so far and card payment',
    icon: ReceiptIcon,
    href: '/guest/bill',
  },
];

export default function GuestHomePage() {
  const { user } = useAuth();
  const [showRating, setShowRating] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [roomRating, setRoomRating] = useState(0);
  const [comment, setComment] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rated, setRated] = useState<'checking' | 'no' | 'yes'>('checking');

  const firstName = user?.firstName;
  const bookingId = user?.bookingId;
  const booking = user?.booking;
  // Signed in before arrival (booking confirmed, not yet checked in)
  const preArrival = booking?.status === 'CONFIRMED';
  const actions = preArrival ? ACTIONS.filter((a) => a.href !== '/guest/services') : ACTIONS;

  // Check if the guest has already submitted a rating for this booking
  useEffect(() => {
    if (!bookingId || preArrival) return;
    api
      .get(`/ratings/booking/${bookingId}`)
      .then(({ data }) => setRated(data ? 'yes' : 'no'))
      .catch(() => setRated('no'));
  }, [bookingId, preArrival]);

  function closeRating() {
    setShowRating(false);
    setOverallRating(0);
    setRoomRating(0);
    setComment('');
    setAttempted(false);
  }

  async function submitRating(e: FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (!overallRating || !roomRating || !bookingId) return;
    setSubmitting(true);
    try {
      await api.post('/ratings', { bookingId, overallRating, roomRating, comment: comment.trim() || undefined });
      toast.success('Thank you for your feedback!');
      setRated('yes');
      closeRating();
    } catch {
      // errors shown by interceptor
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      <motion.header variants={riseItem} className="lg:col-span-12">
        <h1 className="font-cormorant text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.01em] sm:text-5xl">
          {preArrival ? 'Your upcoming stay' : firstName ? `Welcome, ${firstName}` : 'Welcome back'}
        </h1>
        <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-guest-muted">
          {preArrival
            ? `We look forward to welcoming you${firstName ? `, ${firstName}` : ''}.`
            : 'How can we make your stay more comfortable?'}
        </p>
      </motion.header>

      {booking && (
        <motion.div variants={riseItem} className="lg:col-span-7">
          <StayCard booking={booking} preArrival={preArrival} />
        </motion.div>
      )}

      <motion.div variants={riseItem} className={clsx('grid content-start gap-4', booking ? 'lg:col-span-5' : 'lg:col-span-12')}>
        <div className={clsx('grid gap-3', actions.length > 1 && 'grid-cols-2')}>
          {actions.map((action, i) => (
            <ActionTile key={action.href} action={action} featured={i === 0 && actions.length > 1} wide={actions.length === 1} />
          ))}
        </div>

        {preArrival ? (
          <section className="card flex gap-4 p-5">
            <IconTile icon={CallBellIcon} />
            <div className="min-w-0">
              <h2 className="text-[15px] font-medium leading-snug">Requests open once you’ve checked in.</h2>
              <p className="mt-1 text-sm leading-relaxed text-guest-muted">
                Need something before you arrive? Write to{' '}
                <a
                  href="mailto:stay@cestlastay.com"
                  className="break-words font-medium text-guest-clay underline-offset-4 hover:underline"
                >
                  stay@cestlastay.com
                </a>
              </p>
            </div>
          </section>
        ) : (
          <section className="card p-5" aria-busy={rated === 'checking'}>
            <div className="flex gap-4">
              <IconTile icon={StarIcon} />
              <div className="min-w-0">
                <h2 className="text-[15px] font-medium leading-snug">Rate Your Stay</h2>
                <p className="mt-1 text-sm leading-relaxed text-guest-muted">Help us improve with your honest feedback</p>
              </div>
            </div>
            {rated === 'checking' ? (
              <Skeleton className="mt-4 h-11 rounded-full" />
            ) : rated === 'yes' ? (
              <p className="mt-4 flex items-start gap-2.5 rounded-2xl bg-guest-palm/10 px-4 py-3 text-sm text-guest-palm">
                <CheckCircleIcon size={18} weight="fill" aria-hidden className="mt-px shrink-0" />
                You’ve already submitted your rating. Thank you!
              </p>
            ) : (
              <button type="button" className="btn-primary mt-4 w-full" onClick={() => setShowRating(true)}>
                Leave a Rating
              </button>
            )}
          </section>
        )}
      </motion.div>

      <Sheet open={showRating} onClose={closeRating} title="Rate Your Stay" description="Your feedback means a lot to us">
        <form onSubmit={submitRating} noValidate className="flex min-h-0 flex-col">
          <SheetBody className="grid gap-6">
            <StarPicker
              label="Overall experience"
              value={overallRating}
              onChange={setOverallRating}
              error={attempted && !overallRating ? 'Choose a rating from 1 to 5 stars.' : undefined}
            />
            <StarPicker
              label="Room quality & cleanliness"
              value={roomRating}
              onChange={setRoomRating}
              error={attempted && !roomRating ? 'Choose a rating from 1 to 5 stars.' : undefined}
            />
            <div className="grid gap-2">
              <label htmlFor="stay-rating-comment" className="text-sm font-medium">
                Comments <span className="font-normal text-guest-muted">(optional)</span>
              </label>
              <textarea
                id="stay-rating-comment"
                className="input"
                rows={3}
                placeholder="Tell us what you loved or how we can improve..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </SheetBody>
          <SheetFooter>
            <button type="button" className="btn-secondary" onClick={closeRating}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? <Pending>Submitting…</Pending> : 'Submit Rating'}
            </button>
          </SheetFooter>
        </form>
      </Sheet>
    </motion.div>
  );
}

/** "Check-in in 12 days" before arrival, "Night 2 of 4" during the stay. */
function stayStatus(booking: GuestBookingSummary, preArrival: boolean, stayNights: number): string {
  const today = startOfToday();
  if (preArrival) {
    const days = differenceInCalendarDays(stayDate(booking.checkInDate), today);
    return days > 0 ? `Check-in in ${days} day${days !== 1 ? 's' : ''}` : 'Arriving today';
  }
  if (differenceInCalendarDays(stayDate(booking.checkOutDate), today) <= 0) return 'Check-out today';
  const night = differenceInCalendarDays(today, stayDate(booking.checkInDate)) + 1;
  return `Night ${Math.min(Math.max(night, 1), stayNights)} of ${stayNights}`;
}

function StayCard({ booking, preArrival }: { booking: GuestBookingSummary; preArrival: boolean }) {
  const stayNights = Math.max(1, nights(booking.checkInDate, booking.checkOutDate));
  const photo: Photo = preArrival ? 'heroMain' : 'balcony';

  return (
    <section aria-label="Your stay" className="card overflow-hidden">
      <div className="relative aspect-[16/10] bg-guest-ink/10 sm:aspect-[16/9]">
        <StayPhoto name={photo} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-guest-surface to-transparent" />
      </div>

      <div className="px-5 pb-5 sm:px-7 sm:pb-7">
        <Badge tone="clay" live={!preArrival}>
          {stayStatus(booking, preArrival, stayNights)}
        </Badge>

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 sm:gap-4">
          <StayDate label="Check-in" iso={booking.checkInDate} />
          <div className="flex min-w-[64px] flex-col items-center gap-1.5 pb-2.5">
            <span className="whitespace-nowrap text-xs font-medium text-guest-muted">
              {stayNights} night{stayNights !== 1 ? 's' : ''}
            </span>
            <span aria-hidden className="flex w-full items-center gap-1 text-guest-clay">
              <span className="h-px flex-1 bg-guest-ink/20" />
              <MoonIcon size={12} weight="fill" />
              <span className="h-px flex-1 bg-guest-ink/20" />
            </span>
          </div>
          <StayDate label="Check-out" iso={booking.checkOutDate} align="right" />
        </div>

        {booking.rooms.length > 0 && (
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {booking.rooms.map((r) => (
              <li key={r.roomNumber} className="flex items-center gap-3 rounded-2xl bg-guest-ink/[0.04] px-3.5 py-3">
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-guest-raised text-guest-clay ring-1 ring-guest-ink/[0.06]"
                >
                  <DoorIcon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium tabular-nums leading-tight">Room {r.roomNumber}</p>
                  {r.categoryName && <p className="mt-0.5 truncate text-xs text-guest-muted">{r.categoryName}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-guest-ink/[0.07] pt-4">
          <div className="min-w-0">
            <p className="text-xs text-guest-muted">Booking number</p>
            <p className="mt-0.5 truncate text-sm font-medium tabular-nums tracking-wide">{booking.bookingNumber}</p>
          </div>
          <CopyButton value={booking.bookingNumber} />
        </div>
      </div>
    </section>
  );
}

function StayDate({ label, iso, align = 'left' }: { label: string; iso: string; align?: 'left' | 'right' }) {
  const d = stayDate(iso);
  return (
    <div className={clsx('min-w-0', align === 'right' && 'text-right')}>
      <p className="text-xs text-guest-muted">{label}</p>
      {/* Lining figures: Cormorant's old-style 1 reads as an I ("Fri I Oct") */}
      <p className="mt-1 font-cormorant text-[1.375rem] font-semibold leading-none lining-nums sm:text-[1.75rem]">
        <time dateTime={format(d, 'yyyy-MM-dd')}>{format(d, 'EEE d MMM')}</time>
      </p>
      <p className="mt-1 text-xs tabular-nums text-guest-muted">{format(d, 'yyyy')}</p>
    </div>
  );
}

function StayPhoto({ name }: { name: Photo }) {
  const srcSet = (ext: string) => `/login/${name}-960.${ext} 960w, /login/${name}-1440.${ext} 1440w`;
  const sizes = '(min-width: 1024px) 560px, 100vw';
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet('webp')} sizes={sizes} />
      <img
        src={`/login/${name}-960.webp`}
        alt={PHOTO_ALT[name]}
        width={960}
        height={640}
        decoding="async"
        draggable={false}
        className="absolute inset-0 size-full object-cover"
      />
    </picture>
  );
}

/** Copies the booking number, for emails to the front desk. */
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      toast.error('Couldn’t copy. Select the number to copy it instead.');
    }
  };

  return (
    <button type="button" onClick={copy} className="btn-secondary shrink-0 px-3.5 py-2 text-sm">
      {copied ? <CheckIcon size={16} aria-hidden className="text-guest-palm" /> : <CopyIcon size={16} aria-hidden />}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

function ActionTile({ action, featured, wide }: { action: Action; featured: boolean; wide: boolean }) {
  const { icon: Icon } = action;
  return (
    <Link
      to={action.href}
      className={clsx(
        'group flex rounded-[1.75rem] p-5 transition-[transform,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-guest-clay/50',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-guest-canvas',
        wide ? 'items-center gap-4' : 'min-h-[164px] flex-col justify-between gap-6',
        featured
          ? 'bg-guest-clay text-guest-on-clay shadow-guest hover:shadow-guest-lg'
          : 'card hover:shadow-guest-lg',
      )}
    >
      <div className={wide ? 'contents' : 'flex w-full items-start justify-between'}>
        <span
          aria-hidden
          className={clsx(
            'flex size-11 shrink-0 items-center justify-center rounded-2xl',
            featured ? 'bg-guest-on-clay/15' : 'bg-guest-clay/10 text-guest-clay',
          )}
        >
          <Icon size={22} />
        </span>
        {!wide && <TileArrow />}
      </div>
      <div className={clsx('min-w-0', wide && 'flex-1')}>
        <p className="text-[15px] font-medium leading-snug">{action.label}</p>
        <p className={clsx('mt-1 text-[13px] leading-snug', !featured && 'text-guest-muted')}>{action.description}</p>
      </div>
      {wide && <TileArrow />}
    </Link>
  );
}

function TileArrow() {
  return (
    <ArrowUpRightIcon
      size={18}
      aria-hidden
      className="shrink-0 opacity-70 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
    />
  );
}
