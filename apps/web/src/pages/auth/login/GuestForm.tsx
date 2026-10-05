import { FormEvent, useState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';

interface Props {
  /** This form's request is in flight */
  pending: boolean;
  /** Any sign-in is in flight */
  disabled: boolean;
  onSubmit: (bookingNumber: string, lastName: string) => void;
}

const inputClass =
  'block h-11 w-full rounded-xl border border-ink/15 bg-white px-3.5 text-[15px] text-ink ' +
  'placeholder:text-ink/35 shadow-[inset_0_1px_2px_rgb(58_42_31/0.06)] transition ' +
  'focus:border-clay focus:outline-none focus:ring-4 focus:ring-clay/15';

/** Booking number + last name — the sign-in that works without a Google account. */
export function GuestForm({ pending, disabled, onSubmit }: Props) {
  const [bookingNumber, setBookingNumber] = useState('');
  const [lastName, setLastName] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(bookingNumber.trim(), lastName.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div>
        <label htmlFor="login-booking" className="mb-1.5 block text-sm font-medium text-ink/80">
          Booking number
        </label>
        <input
          id="login-booking"
          className={`${inputClass} font-mono tracking-wide`}
          placeholder="BKG-20261012-0001"
          value={bookingNumber}
          onChange={(e) => setBookingNumber(e.target.value.toUpperCase())}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
        />
      </div>
      <div>
        <label htmlFor="login-last-name" className="mb-1.5 block text-sm font-medium text-ink/80">
          Last name
        </label>
        <input
          id="login-last-name"
          className={inputClass}
          placeholder="As on your booking"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          autoComplete="family-name"
          required
        />
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-ink to-clay-dark
                   text-[15px] font-medium tracking-wide text-cream shadow-[0_12px_24px_-12px_rgb(58_42_31/0.7)]
                   transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay
                   focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            Finding your stay…
          </>
        ) : (
          <>
            Access my stay
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </>
        )}
      </button>
    </form>
  );
}
