import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { differenceInCalendarDays, isAfter, parseISO } from 'date-fns';
import { Check, Loader2 } from 'lucide-react';
import { reserve as reserveContent, rooms, formatPrice } from '../../lib/content';
import Reveal from '../ui/Reveal';
import Button from '../ui/Button';
import { submitReservation, getRoomCategories, isBookingApiEnabled } from '../../lib/booking';
import type { ReservationResult } from '../../lib/booking';
import type { IRoomCategory } from '../../types/booking.types';
import { ROOM_SELECT_EVENT } from '../../lib/events';

const today = new Date().toISOString().slice(0, 10);

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  roomId: string;
  specialRequests: string;
}

const initial: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  checkIn: '',
  checkOut: '',
  guests: '2',
  roomId: rooms.items[0].id,
  specialRequests: '',
};

type Status = 'idle' | 'submitting' | 'done' | 'error';

export default function Reserve() {
  const [form, setForm] = useState<FormState>(initial);
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<ReservationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Real room categories from the API (only when booking wiring is enabled).
  const [categories, setCategories] = useState<IRoomCategory[]>([]);

  // When the booking API is on, populate the villa <select> from the real
  // catalog so the form submits a valid IRoomCategory.id.
  useEffect(() => {
    if (!isBookingApiEnabled) return;
    let active = true;
    getRoomCategories()
      .then((cats) => {
        if (!active) return;
        setCategories(cats);
        if (cats.length) {
          setForm((f) => ({
            ...f,
            roomId: cats.some((c) => c.id === f.roomId) ? f.roomId : cats[0].id,
          }));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // "Book Now" on a villa card prefills the villa here, then scrolls down.
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setForm((f) => {
        // With real categories loaded, ignore demo content ids that don't map.
        if (isBookingApiEnabled && !categories.some((c) => c.id === id)) return f;
        return { ...f, roomId: id };
      });
    };
    window.addEventListener(ROOM_SELECT_EVENT, handler);
    return () => window.removeEventListener(ROOM_SELECT_EVENT, handler);
  }, [categories]);

  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;
    try {
      const n = differenceInCalendarDays(parseISO(form.checkOut), parseISO(form.checkIn));
      return n > 0 ? n : 0;
    } catch {
      return 0;
    }
  }, [form.checkIn, form.checkOut]);

  const selectedPrice = useMemo(() => {
    if (isBookingApiEnabled && categories.length) {
      return categories.find((c) => c.id === form.roomId)?.basePrice ?? 0;
    }
    return rooms.items.find((r) => r.id === form.roomId)?.pricePerNight ?? 0;
  }, [form.roomId, categories]);

  const update =
    (key: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.firstName.trim() || !form.lastName.trim()) return 'Please enter your full name.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return 'Please enter a valid email address.';
    if (!form.checkIn || !form.checkOut) return 'Please choose your arrival and departure dates.';
    if (!isAfter(parseISO(form.checkOut), parseISO(form.checkIn)))
      return 'Departure must be after arrival.';
    return null;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setStatus('submitting');
    const res = await submitReservation({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      checkInDate: form.checkIn,
      checkOutDate: form.checkOut,
      numberOfGuests: Number(form.guests),
      // Real IRoomCategory.id when the booking API is enabled (the villa <select>
      // is populated from GET /rooms/categories); demo content id otherwise.
      categoryId: form.roomId,
      specialRequests: form.specialRequests.trim() || undefined,
    });
    setResult(res);
    setStatus(res.ok ? 'done' : 'error');
  };

  const reset = () => {
    setForm(initial);
    setStatus('idle');
    setResult(null);
    setError(null);
  };

  return (
    <section id="reserve" className="section relative overflow-hidden text-white">
      {/* warm + cool glows */}
      <div
        className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-sunset-500/20 blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-ocean-400/20 blur-[120px]"
        aria-hidden
      />

      <div className="container-x relative">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left — copy + reassurance */}
          <Reveal>
            <p className="eyebrow mb-4 text-sunset-300">{reserveContent.eyebrow}</p>
            <h2 className="font-serif text-[clamp(2rem,4.6vw,3.6rem)] font-medium leading-[1.06] text-white">
              {reserveContent.title}
            </h2>
            <p className="mt-6 max-w-md font-sans leading-relaxed text-white/75">
              {reserveContent.intro}
            </p>
            <ul className="mt-9 space-y-3.5">
              {reserveContent.reassurance.map((r) => (
                <li key={r} className="flex items-start gap-3 font-sans text-sm text-white/85">
                  <Check size={18} strokeWidth={1.6} className="mt-0.5 shrink-0 text-palm-300" />
                  {r}
                </li>
              ))}
            </ul>
            {!isBookingApiEnabled && (
              <p className="mt-9 max-w-md font-sans text-xs leading-relaxed text-white/45">
                Demo mode — requests are acknowledged locally (no booking is created).
                Set VITE_ENABLE_BOOKING_API=true once the public API endpoints are live.
              </p>
            )}
          </Reveal>

          {/* Right — form / confirmation */}
          <Reveal delay={0.1}>
            <div className="card p-7 text-ink md:p-9">
              {status === 'done' && result ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-palm-100">
                    <Check size={30} strokeWidth={1.5} className="text-palm-700" />
                  </div>
                  <h3 className="mt-6 font-serif text-2xl text-ink">Thank you</h3>
                  <p className="mt-3 max-w-sm font-sans text-sm leading-relaxed text-muted">
                    {result.message}
                  </p>
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-7 font-sans text-sm text-ocean-300 underline-offset-4 hover:underline"
                  >
                    Make another request
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="firstName">First name</label>
                      <input id="firstName" className="field" value={form.firstName} onChange={update('firstName')} autoComplete="given-name" />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="lastName">Last name</label>
                      <input id="lastName" className="field" value={form.lastName} onChange={update('lastName')} autoComplete="family-name" />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="email">Email</label>
                      <input id="email" type="email" className="field" value={form.email} onChange={update('email')} autoComplete="email" />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="phone">
                        Phone <span className="lowercase text-muted/60">(optional)</span>
                      </label>
                      <input id="phone" className="field" value={form.phone} onChange={update('phone')} autoComplete="tel" />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="checkIn">Arrival</label>
                      <input id="checkIn" type="date" min={today} className="field" value={form.checkIn} onChange={update('checkIn')} />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="checkOut">Departure</label>
                      <input id="checkOut" type="date" min={form.checkIn || today} className="field" value={form.checkOut} onChange={update('checkOut')} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="guests">Guests</label>
                      <select id="guests" className="field" value={form.guests} onChange={update('guests')}>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'guest' : 'guests'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label" htmlFor="roomId">Villa</label>
                      <select id="roomId" className="field" value={form.roomId} onChange={update('roomId')}>
                        {(isBookingApiEnabled && categories.length
                          ? categories.map((c) => ({ id: c.id, name: c.name }))
                          : rooms.items.map((r) => ({ id: r.id, name: r.name }))
                        ).map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="field-label" htmlFor="specialRequests">
                      Special requests <span className="lowercase text-muted/60">(optional)</span>
                    </label>
                    <textarea id="specialRequests" rows={3} className="field resize-none" value={form.specialRequests} onChange={update('specialRequests')} />
                  </div>

                  {error && <p className="mt-4 font-sans text-sm text-red-600">{error}</p>}

                  <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                    <p className="font-sans text-sm text-muted">
                      {nights > 0 ? (
                        <>
                          {nights} {nights === 1 ? 'night' : 'nights'} · est. from{' '}
                          <span className="text-ink">{formatPrice(nights * selectedPrice)}</span>
                        </>
                      ) : (
                        'Select your dates'
                      )}
                    </p>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full sm:w-auto"
                      disabled={status === 'submitting'}
                    >
                      {status === 'submitting' ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Reserving…
                        </>
                      ) : (
                        'Reserve Stay'
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
