import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Mail } from 'lucide-react';
import Button from '../ui/Button';
import { requestGuestOtp, verifyGuestOtp } from '../../lib/booking';
import { portalHandoffUrl } from '../../lib/portal';

/** Matches the API's per-email resend cooldown. */
const RESEND_SECONDS = 60;

interface Props {
  email: string;
}

/**
 * Shown under the booking confirmation: the 6-digit code emailed with the
 * booking signs the guest straight into the portal (no login page).
 */
export default function VerifyStay({ email }: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // The booking request already sent a code, so start on the cooldown.
  const [wait, setWait] = useState(RESEND_SECONDS);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const handoff = await verifyGuestOtp(email, code);
      window.location.assign(portalHandoffUrl(handoff));
    } catch {
      setBusy(false);
      setError('That code is wrong or has expired. Check the latest email, or send a new code.');
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    setWait(RESEND_SECONDS);
    try {
      await requestGuestOtp(email);
      setNotice('A new code is on its way.');
    } catch {
      setError('We couldn’t send a new code just now. Please try again shortly.');
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 w-full max-w-sm text-left" noValidate>
      <div className="flex items-start gap-3 rounded-xl bg-sand-50/60 p-4 font-sans text-sm text-ink/80">
        <Mail size={18} strokeWidth={1.6} className="mt-0.5 shrink-0 text-sunset-600" />
        <p>
          We emailed a 6-digit code to <span className="font-medium text-ink">{email}</span>.
          Enter it to open your stay in the guest portal.
        </p>
      </div>

      <label className="field-label mt-5 block" htmlFor="otp">
        Sign-in code
      </label>
      <input
        ref={inputRef}
        id="otp"
        className="field text-center font-mono text-lg tracking-[0.5em]"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="••••••"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        aria-invalid={!!error}
        aria-describedby={error ? 'otp-error' : undefined}
      />

      {error && (
        <p id="otp-error" className="mt-3 font-sans text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && !error && <p className="mt-3 font-sans text-sm text-palm-700">{notice}</p>}

      <Button type="submit" variant="primary" size="lg" className="mt-5 w-full" disabled={busy}>
        {busy ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Opening your stay…
          </>
        ) : (
          'Open my stay'
        )}
      </Button>

      <p className="mt-4 text-center font-sans text-sm text-muted">
        {wait > 0 ? (
          <>Didn’t get it? You can resend in {wait}s.</>
        ) : (
          <button
            type="button"
            onClick={resend}
            className="text-sunset-600 underline-offset-4 hover:underline"
          >
            Resend code
          </button>
        )}
      </p>
    </form>
  );
}
