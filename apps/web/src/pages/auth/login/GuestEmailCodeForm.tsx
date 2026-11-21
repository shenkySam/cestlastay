import { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';

/** Matches the API's per-email resend cooldown. */
const RESEND_SECONDS = 60;

interface Props {
  /** This form's request is in flight */
  pending: boolean;
  /** Any sign-in is in flight */
  disabled: boolean;
  /** Ask the API to email a code. Rejects only on network / rate-limit errors. */
  onRequest: (email: string) => Promise<void>;
  onVerify: (email: string, code: string) => void;
}

const inputClass =
  'block h-11 w-full rounded-xl border border-ink/15 bg-white px-3.5 text-[15px] text-ink ' +
  'placeholder:text-ink/35 shadow-[inset_0_1px_2px_rgb(58_42_31/0.06)] transition ' +
  'focus:border-clay focus:outline-none focus:ring-4 focus:ring-clay/15';

const buttonClass =
  'group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-ink to-clay-dark ' +
  'text-[15px] font-medium tracking-wide text-cream shadow-[0_12px_24px_-12px_rgb(58_42_31/0.7)] ' +
  'transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50 disabled:cursor-not-allowed disabled:opacity-60';

/** Email → 6-digit code: guest sign-in that works with any email provider. */
export function GuestEmailCodeForm({ pending, disabled, onRequest, onVerify }: Props) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  const send = async () => {
    setSendError('');
    setSending(true);
    try {
      await onRequest(email.trim());
      setStep('code');
      setWait(RESEND_SECONDS);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setSendError(
        status === 429
          ? 'Too many requests. Please wait a minute and try again.'
          : 'We couldn’t send a code just now. Please try again.',
      );
    } finally {
      setSending(false);
    }
  };

  const handleEmail = (e: FormEvent) => {
    e.preventDefault();
    send();
  };

  const handleCode = (e: FormEvent) => {
    e.preventDefault();
    onVerify(email.trim(), code);
  };

  if (step === 'email') {
    return (
      <form onSubmit={handleEmail} className="space-y-3.5">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-ink/80">
            Email you booked with
          </label>
          <input
            id="login-email"
            type="email"
            className={inputClass}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        {sendError && <p className="text-sm text-clay-dark">{sendError}</p>}
        <button type="submit" disabled={disabled || sending} className={buttonClass}>
          {sending ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              Sending code…
            </>
          ) : (
            <>
              Email me a code
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

  return (
    <form onSubmit={handleCode} className="space-y-3.5">
      <p className="text-sm leading-relaxed text-ink/70">
        If <span className="font-medium text-ink">{email.trim()}</span> has a current or upcoming stay, a 6-digit
        code is on its way. It expires in 10 minutes.
      </p>
      <div>
        <label htmlFor="login-code" className="mb-1.5 block text-sm font-medium text-ink/80">
          Sign-in code
        </label>
        <input
          ref={codeRef}
          id="login-code"
          className={`${inputClass} text-center font-mono text-lg tracking-[0.5em]`}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
        />
      </div>
      {sendError && <p className="text-sm text-clay-dark">{sendError}</p>}
      <button type="submit" disabled={disabled || code.length !== 6} className={buttonClass}>
        {pending ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            Checking code…
          </>
        ) : (
          'Sign in'
        )}
      </button>
      <div className="flex items-center justify-between text-xs text-ink/60">
        <button
          type="button"
          onClick={() => { setStep('email'); setCode(''); setSendError(''); }}
          className="hover:text-ink"
        >
          Use a different email
        </button>
        {wait > 0 ? (
          <span>Resend in {wait}s</span>
        ) : (
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="font-medium text-clay hover:text-clay-dark"
          >
            Resend code
          </button>
        )}
      </div>
    </form>
  );
}
