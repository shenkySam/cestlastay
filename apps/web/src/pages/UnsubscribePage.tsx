import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircleIcon, CircleNotchIcon, EnvelopeSimpleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { isAxiosError } from 'axios';
import api from '@/lib/api';
import { IconTile } from '@/components/guest/ui';

type State = 'idle' | 'sending' | 'done' | 'error' | 'invalid';

/**
 * Public page behind the "Unsubscribe from offers" link in marketing email.
 * The link itself must not unsubscribe (mail scanners prefetch links), so the
 * guest confirms with a button, which POSTs the email + signed token to the API.
 */
export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const email = params.get('e') ?? '';
  const token = params.get('t') ?? '';
  const [state, setState] = useState<State>(email && token ? 'idle' : 'invalid');

  const confirm = async () => {
    setState('sending');
    try {
      await api.post('/crm/unsubscribe', null, { params: { e: email, t: token } });
      setState('done');
    } catch (err) {
      setState(isAxiosError(err) && err.response?.status === 400 ? 'invalid' : 'error');
    }
  };

  return (
    <div className="guest-shell flex min-h-[100dvh] items-center justify-center px-4 py-12">
      <main className="card w-full max-w-md p-8 text-center sm:p-10">
        {state === 'done' ? (
          <>
            <IconTile icon={CheckCircleIcon} className="mx-auto" />
            <h1 className="mt-5 font-cormorant text-[2rem] font-semibold leading-tight">You're unsubscribed</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-guest-muted">
              <span className="break-all font-medium text-guest-ink">{email}</span> won't receive offers or our
              newsletter. Emails about bookings you make will still reach you.
            </p>
          </>
        ) : state === 'invalid' ? (
          <>
            <IconTile icon={WarningCircleIcon} className="mx-auto" />
            <h1 className="mt-5 font-cormorant text-[2rem] font-semibold leading-tight">This link doesn't work</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-guest-muted">
              It may be incomplete. Use the link in your most recent email, or write to us at{' '}
              <a className="text-guest-clay underline underline-offset-2" href="mailto:stay@cestlastay.com">
                stay@cestlastay.com
              </a>{' '}
              and we'll unsubscribe you.
            </p>
          </>
        ) : (
          <>
            <IconTile icon={EnvelopeSimpleIcon} className="mx-auto" />
            <h1 className="mt-5 font-cormorant text-[2rem] font-semibold leading-tight">Unsubscribe</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-guest-muted">
              Stop sending offers and our newsletter to{' '}
              <span className="break-all font-medium text-guest-ink">{email}</span>? Emails about bookings you make
              will still reach you.
            </p>
            {state === 'error' && (
              <p role="alert" className="mt-4 text-sm text-guest-danger">
                Something went wrong. Please try again.
              </p>
            )}
            <button type="button" className="btn-primary mt-7 w-full" onClick={confirm} disabled={state === 'sending'}>
              {state === 'sending' && <CircleNotchIcon size={18} className="animate-spin" aria-hidden />}
              Unsubscribe
            </button>
          </>
        )}
      </main>
    </div>
  );
}
