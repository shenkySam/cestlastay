import { FormEvent, useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { Icon } from '@phosphor-icons/react';
import {
  ArrowLeftIcon,
  BowlFoodIcon,
  CallBellIcon,
  ChatCircleDotsIcon,
  ChatTextIcon,
  FlowerLotusIcon,
  ForkKnifeIcon,
  PlusIcon,
  StarIcon,
  TShirtIcon,
  WrenchIcon,
} from '@phosphor-icons/react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ServiceType, ServiceStatus } from '@shared/index';
import { riseItem, stagger } from '@/components/admin/ui/motion';
import { stamp } from '@/components/guest/format';
import { Badge, EmptyNote, ErrorNote, FieldError, IconTile, PageIntro, Pending, Skeleton, Tone } from '@/components/guest/ui';
import { Sheet, SheetBody, SheetFooter } from '@/components/guest/Sheet';
import { StarDisplay, StarPicker } from '@/components/guest/StarRating';

interface ServiceRequest {
  id: string;
  ticketNumber: string;
  type: ServiceType;
  status: ServiceStatus;
  priority: number;
  description: string;
  notes?: string;
  requestedAt: string;
  completedAt?: string;
  serviceRating?: number | null;
  ratedAt?: string | null;
}

const TYPE_META: Record<ServiceType, { label: string; icon: Icon }> = {
  [ServiceType.ROOM_SERVICE]: { label: 'Room Service', icon: BowlFoodIcon },
  [ServiceType.LAUNDRY]: { label: 'Laundry', icon: TShirtIcon },
  [ServiceType.SPA]: { label: 'Spa', icon: FlowerLotusIcon },
  [ServiceType.RESTAURANT]: { label: 'Restaurant', icon: ForkKnifeIcon },
  [ServiceType.MAINTENANCE]: { label: 'Maintenance', icon: WrenchIcon },
  [ServiceType.CONCIERGE]: { label: 'Concierge', icon: CallBellIcon },
  [ServiceType.OTHER]: { label: 'Other', icon: ChatCircleDotsIcon },
};

const STATUS_META: Record<ServiceStatus, { label: string; tone: Tone; live?: boolean }> = {
  [ServiceStatus.PENDING]: { label: 'Pending', tone: 'gold' },
  [ServiceStatus.IN_PROGRESS]: { label: 'In progress', tone: 'clay', live: true },
  [ServiceStatus.COMPLETED]: { label: 'Completed', tone: 'palm' },
  [ServiceStatus.CANCELLED]: { label: 'Cancelled', tone: 'neutral' },
};

const isOpen = (sr: ServiceRequest) =>
  sr.status === ServiceStatus.PENDING || sr.status === ServiceStatus.IN_PROGRESS;

export default function GuestServiceRequestPage() {
  const { user } = useAuth();
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<ServiceType | null>(null);
  const [description, setDescription] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Rating sheet state
  const [ratingTarget, setRatingTarget] = useState<ServiceRequest | null>(null);
  const [srRating, setSrRating] = useState(0);
  const [srComment, setSrComment] = useState('');
  const [ratingAttempted, setRatingAttempted] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const descId = useId();
  const descHintId = useId();
  const descErrorId = useId();

  const guestId = user?.guest?.id;
  // Signed in before arrival — the API refuses requests until check-in
  const preArrival = user?.booking?.status === 'CONFIRMED';

  useEffect(() => {
    if (!guestId || preArrival) return;
    loadRequests();
    // Guests get no live updates, so refresh quietly when they come back to the tab
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadRequests(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [guestId, preArrival]);

  async function loadRequests(quiet = false) {
    if (!quiet) {
      setLoading(true);
      setLoadError(false);
    }
    try {
      const { data } = await api.get('/services', { params: { guestId } });
      setMyRequests(data);
      setLoadError(false);
    } catch {
      // A failed quiet refresh keeps the list already on screen
      if (!quiet) setLoadError(true);
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  function closeForm() {
    setShowForm(false);
    setSelectedType(null);
    setDescription('');
    setAttempted(false);
  }

  async function submitRequest(e: FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (!selectedType || !description.trim() || !guestId) return;
    setSubmitting(true);
    try {
      await api.post('/services', {
        guestId,
        type: selectedType,
        description: description.trim(),
      });
      toast.success('Request submitted! Our team will attend to you shortly.');
      closeForm();
      loadRequests(true);
    } catch {
      // errors shown by interceptor
    } finally {
      setSubmitting(false);
    }
  }

  function openRating(sr: ServiceRequest) {
    setRatingTarget(sr);
    setSrRating(0);
    setSrComment('');
    setRatingAttempted(false);
  }

  async function submitServiceRating(e: FormEvent) {
    e.preventDefault();
    setRatingAttempted(true);
    if (!ratingTarget || !srRating) return;
    setRatingSubmitting(true);
    try {
      await api.post(`/services/${ratingTarget.id}/rate`, {
        rating: srRating,
        comment: srComment.trim() || undefined,
      });
      toast.success('Thanks for rating this service!');
      setRatingTarget(null);
      loadRequests(true);
    } catch {
      // errors shown by interceptor
    } finally {
      setRatingSubmitting(false);
    }
  }

  if (preArrival) {
    return (
      <div className="max-w-3xl">
        <section className="card p-6 sm:p-8">
          <IconTile icon={CallBellIcon} />
          <h1 className="mt-5 font-cormorant text-[2rem] font-semibold leading-[1.1] sm:text-[2.5rem]">
            Requests open once you’ve checked in
          </h1>
          <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-guest-muted">
            Need something before you arrive? Write to{' '}
            <a
              href="mailto:stay@cestlastay.com"
              className="break-words font-medium text-guest-clay underline-offset-4 hover:underline"
            >
              stay@cestlastay.com
            </a>
          </p>
          <Link to="/guest/home" className="btn-secondary mt-6">
            <ArrowLeftIcon size={18} aria-hidden />
            Back to my booking
          </Link>
        </section>
      </div>
    );
  }

  const open = myRequests.filter(isOpen);
  const past = myRequests.filter((sr) => !isOpen(sr));
  const typeError = attempted && !selectedType;
  const descError = attempted && !description.trim();

  return (
    <div className="max-w-3xl">
      <PageIntro
        title="Request a Service"
        description="Our team will respond promptly."
        action={
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            <PlusIcon size={18} aria-hidden />
            New Request
          </button>
        }
      />

      <div className="mt-8">
        {loading ? (
          <div role="status" aria-label="Loading your requests" className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <RequestSkeleton key={i} />
            ))}
          </div>
        ) : loadError ? (
          <ErrorNote title="Couldn’t load your requests" onRetry={() => loadRequests()} />
        ) : myRequests.length === 0 ? (
          <EmptyNote icon={CallBellIcon} title="No service requests yet">
            Tap New Request to ask for room service, laundry, a repair or anything else.
          </EmptyNote>
        ) : (
          <div className="grid gap-8">
            {open.length > 0 && (
              <RequestGroup title="Open requests" requests={open} onRate={openRating} />
            )}
            {past.length > 0 && (
              <RequestGroup title="Past requests" requests={past} onRate={openRating} />
            )}
          </div>
        )}
      </div>

      {/* New request */}
      <Sheet open={showForm} onClose={closeForm} title="New Service Request">
        <form onSubmit={submitRequest} noValidate className="flex min-h-0 flex-col">
          <SheetBody className="grid gap-6">
            <fieldset className="min-w-0">
              <legend className="text-sm font-medium">What do you need?</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.values(ServiceType).map((t) => {
                  const { label, icon: TypeIcon } = TYPE_META[t];
                  return (
                    <label key={t} className="cursor-pointer">
                      <input
                        type="radio"
                        name="service-type"
                        value={t}
                        checked={selectedType === t}
                        onChange={() => setSelectedType(t)}
                        className="peer sr-only"
                      />
                      <span
                        className="flex items-center gap-2 rounded-full border border-guest-ink/15 bg-guest-raised px-3.5 py-2 text-sm font-medium
                                   transition-[background-color,border-color,color,transform] duration-200 hover:border-guest-ink/30 active:scale-[0.97]
                                   peer-checked:border-guest-clay peer-checked:bg-guest-clay peer-checked:text-guest-on-clay
                                   peer-focus-visible:ring-2 peer-focus-visible:ring-guest-clay/50 peer-focus-visible:ring-offset-2
                                   peer-focus-visible:ring-offset-guest-surface"
                      >
                        <TypeIcon size={18} aria-hidden />
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
              {typeError && (
                <div className="mt-2">
                  <FieldError>Choose the kind of service you need.</FieldError>
                </div>
              )}
            </fieldset>

            <div className="grid gap-2">
              <label htmlFor={descId} className="text-sm font-medium">
                Describe your request
              </label>
              <textarea
                id={descId}
                className="input"
                rows={4}
                placeholder="e.g. Please bring extra towels and mineral water"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                aria-invalid={descError}
                aria-describedby={descError ? `${descHintId} ${descErrorId}` : descHintId}
              />
              <p id={descHintId} className="text-xs text-guest-muted">
                Add details that help, such as a time that suits you.
              </p>
              {descError && <FieldError id={descErrorId}>Tell us a little about what you need.</FieldError>}
            </div>
          </SheetBody>
          <SheetFooter>
            <button type="button" className="btn-secondary" onClick={closeForm}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? <Pending>Submitting…</Pending> : 'Submit Request'}
            </button>
          </SheetFooter>
        </form>
      </Sheet>

      {/* Service rating */}
      <Sheet
        open={!!ratingTarget}
        onClose={() => setRatingTarget(null)}
        size="sm"
        title="Rate this Service"
        description={
          ratingTarget && `${TYPE_META[ratingTarget.type].label} · ${ratingTarget.ticketNumber}`
        }
      >
        <form onSubmit={submitServiceRating} noValidate className="flex min-h-0 flex-col">
          <SheetBody className="grid gap-6">
            <StarPicker
              label="How satisfied were you?"
              value={srRating}
              onChange={setSrRating}
              error={ratingAttempted && !srRating ? 'Choose a rating from 1 to 5 stars.' : undefined}
            />
            <div className="grid gap-2">
              <label htmlFor="service-rating-comment" className="text-sm font-medium">
                Comments <span className="font-normal text-guest-muted">(optional)</span>
              </label>
              <textarea
                id="service-rating-comment"
                className="input"
                rows={2}
                placeholder="Any specific feedback?"
                value={srComment}
                onChange={(e) => setSrComment(e.target.value)}
              />
            </div>
          </SheetBody>
          <SheetFooter>
            <button type="button" className="btn-secondary" onClick={() => setRatingTarget(null)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={ratingSubmitting}>
              {ratingSubmitting ? <Pending>Submitting…</Pending> : 'Submit'}
            </button>
          </SheetFooter>
        </form>
      </Sheet>
    </div>
  );
}

function RequestGroup({
  title,
  requests,
  onRate,
}: {
  title: string;
  requests: ServiceRequest[];
  onRate: (sr: ServiceRequest) => void;
}) {
  return (
    <section>
      <h2 className="flex items-baseline gap-2 text-sm font-medium text-guest-muted">
        {title}
        <span className="tabular-nums">{requests.length}</span>
      </h2>
      <motion.ul variants={stagger} initial="hidden" animate="show" className="mt-3 grid gap-3">
        <AnimatePresence>
          {requests.map((sr) => (
            <motion.li key={sr.id} layout="position" variants={riseItem} exit={{ opacity: 0 }}>
              <RequestCard sr={sr} onRate={onRate} />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </section>
  );
}

function RequestCard({ sr, onRate }: { sr: ServiceRequest; onRate: (sr: ServiceRequest) => void }) {
  const { label, icon } = TYPE_META[sr.type];
  const status = STATUS_META[sr.status];

  return (
    <article className="card p-4 sm:p-5">
      <div className="flex gap-3.5 sm:gap-4">
        <IconTile icon={icon} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <h3 className="text-[15px] font-medium leading-snug">{label}</h3>
            <Badge tone={status.tone} live={status.live}>
              {status.label}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs tabular-nums text-guest-muted">
            {sr.ticketNumber} · {stamp(sr.requestedAt)}
          </p>

          <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed">{sr.description}</p>

          {sr.notes && (
            <div className="mt-3 flex gap-2.5 rounded-2xl bg-guest-ink/[0.04] px-3.5 py-2.5 text-sm leading-relaxed">
              <ChatTextIcon size={18} aria-hidden className="mt-0.5 shrink-0 text-guest-muted" />
              <p className="min-w-0 break-words">
                <span className="font-medium">Staff note: </span>
                {sr.notes}
              </p>
            </div>
          )}

          {sr.status === ServiceStatus.COMPLETED && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-guest-ink/[0.07] pt-3.5">
              <p className="text-xs tabular-nums text-guest-muted">
                {sr.completedAt ? `Completed ${stamp(sr.completedAt, true)}` : 'Completed'}
              </p>
              {sr.serviceRating ? (
                <span className="flex items-center gap-2 text-xs text-guest-muted">
                  <StarDisplay value={sr.serviceRating} />
                  Rated
                </span>
              ) : (
                <button type="button" className="btn-secondary px-3.5 py-1.5 text-sm" onClick={() => onRate(sr)}>
                  <StarIcon size={16} aria-hidden />
                  Rate this service
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function RequestSkeleton() {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex gap-3.5 sm:gap-4">
        <Skeleton className="size-11 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3 w-40 rounded-full" />
          <Skeleton className="mt-4 h-3 rounded-full" />
          <Skeleton className="mt-2 h-3 w-3/4 rounded-full" />
        </div>
      </div>
    </div>
  );
}
