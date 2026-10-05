import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarCheck, ChartColumn, ConciergeBell, LoaderCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_HOME } from '@/lib/roleHome';
import {
  APPLE_CLIENT_ID,
  GOOGLE_CLIENT_ID,
  renderGoogleButton,
  signInWithApple,
} from '@/lib/oauth';
import { LoginMode, ModeSwitch } from './login/ModeSwitch';
import { GuestForm } from './login/GuestForm';
import { ShowcasePanel } from './login/ShowcasePanel';
import { RICH_MOTION_QUERY, WIDE_QUERY, useMediaQuery, useTilt } from './login/useTilt';

const MODE_KEY = 'loginMode';

function readStoredMode(): LoginMode | null {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === 'guest' || v === 'staff' ? v : null;
  } catch {
    return null;
  }
}

function storeMode(mode: LoginMode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Storage blocked (private mode etc.) — the URL still carries the mode
  }
}

function errorMessage(err: unknown, fallback: string) {
  const res = (err as { response?: { status?: number; data?: { message?: string | string[] } } })
    ?.response;
  if (res?.status === 429) return 'Too many attempts. Please wait a minute and try again.';
  const msg = res?.data?.message;
  return (Array.isArray(msg) ? msg[0] : msg) || fallback;
}

const STAFF_FEATURES = [
  { Icon: CalendarCheck, text: 'Bookings, check-in and check-out' },
  { Icon: ConciergeBell, text: 'Service queue and housekeeping' },
  { Icon: ChartColumn, text: 'Payments, ratings and reports' },
];

/**
 * One sign-in page for guests and staff, switched with ?as=guest|staff.
 * Guests: booking number + last name, or Google (matched by booking email).
 * Staff: Google or Apple account registered by an administrator.
 */
export default function LoginPage() {
  const { user, loading, login, guestLogin, guestGoogleLogin } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // ?as= wins, then the mode last used on this device, then Guest
  const asParam = params.get('as');
  const mode: LoginMode =
    asParam === 'guest' || asParam === 'staff' ? asParam : (readStoredMode() ?? 'guest');

  const [pending, setPending] = useState<null | 'form' | 'oauth'>(null);
  const [error, setError] = useState('');

  // Keep the URL in sync without adding history entries, and remember the mode
  useEffect(() => {
    storeMode(mode);
    if (asParam !== mode) {
      setParams((p) => { p.set('as', mode); return p; }, { replace: true });
    }
  }, [mode, asParam, setParams]);

  const setMode = (next: LoginMode) => {
    if (next === mode) return;
    setError('');
    setParams((p) => { p.set('as', next); return p; }, { replace: true });
  };

  // Already signed in → their home
  useEffect(() => {
    if (user) navigate(ROLE_HOME[user.role], { replace: true });
  }, [user, navigate]);

  // Don't show the buttons until we know there's no session (avoids a flash before the redirect)
  const ready = !loading && !user;

  const run = async (kind: 'form' | 'oauth', action: () => Promise<void>, fallback: string) => {
    setError('');
    setPending(kind);
    try {
      await action();
      // AuthContext sets user → the effect above redirects
    } catch (err) {
      setError(errorMessage(err, fallback));
    } finally {
      setPending(null);
    }
  };

  // Google Identity Services keeps a single global callback, so there is one
  // Google button for both modes; the callback reads the mode at click time.
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const onGoogle = (idToken: string) =>
    modeRef.current === 'guest'
      ? run('oauth', () => guestGoogleLogin(idToken), 'Google sign-in failed — please try again.')
      : run('oauth', () => login('google', idToken), 'Google sign-in failed — please try again.');
  const onGoogleRef = useRef(onGoogle);
  onGoogleRef.current = onGoogle;

  const googleButtonRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ready || !GOOGLE_CLIENT_ID || !googleButtonRef.current) return;
    renderGoogleButton(googleButtonRef.current, (idToken) => onGoogleRef.current(idToken)).catch(
      () => setError('Could not load Google sign-in. Check your connection and refresh.'),
    );
  }, [ready]);

  const handleApple = async () => {
    setError('');
    try {
      const idToken = await signInWithApple();
      if (idToken) await run('oauth', () => login('apple', idToken), 'Apple sign-in failed — please try again.');
    } catch {
      setError('Apple sign-in failed — please try again.');
    }
  };

  const handleGuestForm = (bookingNumber: string, lastName: string) =>
    run(
      'form',
      () => guestLogin(bookingNumber, lastName),
      "We couldn't find that booking. Check the number and your last name.",
    );

  // Hidden face of the flipper: out of the tab order and the accessibility tree
  const guestFaceRef = useRef<HTMLDivElement>(null);
  const staffFaceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    guestFaceRef.current?.toggleAttribute('inert', mode !== 'guest');
    staffFaceRef.current?.toggleAttribute('inert', mode !== 'staff');
  }, [mode, ready]);

  const richMotion = useMediaQuery(RICH_MOTION_QUERY);
  const wide = useMediaQuery(WIDE_QUERY);
  const cardRef = useTilt<HTMLDivElement>(ready && richMotion && wide);

  const busy = pending !== null;
  const noProviders = !GOOGLE_CLIENT_ID && !APPLE_CLIENT_ID;

  return (
    <div className="login-page font-jost">
      <div className="login-backdrop" aria-hidden="true">
        <div className="login-floor">
          <div className="login-floor__plane" />
        </div>
        <span className="login-orb login-orb--clay" />
        <span className="login-orb login-orb--gold" />
        <span className="login-orb login-orb--ember" />
      </div>

      {!ready ? (
        <div className="relative flex min-h-screen items-center justify-center">
          <LoaderCircle className="h-7 w-7 animate-spin text-clay" aria-label="Loading" />
        </div>
      ) : (
        <div className="login-fade">
          <main className="login-stage">
            <div className="login-rise">
              <div className="login-card" ref={cardRef}>
                <div className="login-slab" aria-hidden="true" />
                <div className="login-card__body">
                  <section className="login-form" aria-label="Sign in">
                    <div className="flex items-center gap-2.5">
                      <picture>
                        <source type="image/avif" srcSet="/login/logo-mark-480.avif" />
                        <img
                          src="/login/logo-mark-480.webp"
                          alt=""
                          width={480}
                          height={336}
                          className="h-11 w-11 object-cover"
                        />
                      </picture>
                      <span className="font-cormorant text-[22px] font-semibold tracking-wide">
                        C’est La Stay
                      </span>
                    </div>

                    <div className="mt-6">
                      <ModeSwitch mode={mode} onChange={setMode} disabled={busy} />
                    </div>

                    {error && (
                      <div
                        role="alert"
                        className="mt-5 rounded-xl border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay-dark"
                      >
                        {error}
                      </div>
                    )}

                    <div className="login-flipper mt-6" data-side={mode}>
                      <div
                        ref={guestFaceRef}
                        className="login-face login-face--guest"
                        role="tabpanel"
                        id="login-panel-guest"
                        aria-labelledby="login-tab-guest"
                        aria-hidden={mode !== 'guest'}
                      >
                        <h1 className="font-cormorant text-[38px] font-semibold leading-none">Welcome back</h1>
                        <p className="mt-2.5 text-sm leading-relaxed text-ink/70">
                          Sign in to see your booking before you arrive, and to request services and follow
                          your bill during your stay.
                        </p>
                        <div className="mt-5">
                          <GuestForm
                            pending={pending === 'form'}
                            disabled={busy}
                            onSubmit={handleGuestForm}
                          />
                        </div>
                        {GOOGLE_CLIENT_ID && (
                          <div className="mt-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.24em] text-ink/40">
                            <span className="h-px flex-1 bg-ink/10" />
                            or
                            <span className="h-px flex-1 bg-ink/10" />
                          </div>
                        )}
                      </div>

                      <div
                        ref={staffFaceRef}
                        className="login-face login-face--staff"
                        role="tabpanel"
                        id="login-panel-staff"
                        aria-labelledby="login-tab-staff"
                        aria-hidden={mode !== 'staff'}
                      >
                        <h1 className="font-cormorant text-[38px] font-semibold leading-none">Staff &amp; admin</h1>
                        <p className="mt-2.5 text-sm leading-relaxed text-ink/70">
                          Use the Google or Apple account your administrator registered.
                        </p>
                        <div className="mt-6 rounded-2xl border border-ink/10 bg-white/70 p-5">
                          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink/45">
                            Inside the staff app
                          </p>
                          <ul className="mt-4 space-y-3">
                            {STAFF_FEATURES.map(({ Icon, text }) => (
                              <li key={text} className="flex items-center gap-3 text-sm text-ink/75">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-clay/10 text-clay">
                                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                                </span>
                                {text}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {noProviders && (
                          <p className="mt-6 text-sm text-ink/70">
                            {import.meta.env.DEV
                              ? 'Sign-in is not configured — set VITE_GOOGLE_CLIENT_ID and/or VITE_APPLE_CLIENT_ID.'
                              : 'Sign-in is temporarily unavailable.'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Shared provider buttons. The Google container is never display:none —
                        GIS reads its width once, when the button is rendered. */}
                    <div
                      className={`mt-4 flex flex-col items-center gap-2.5 transition-opacity ${
                        busy ? 'pointer-events-none opacity-50' : ''
                      }`}
                      aria-busy={busy}
                    >
                      {GOOGLE_CLIENT_ID && (
                        <div ref={googleButtonRef} className="flex min-h-[40px] w-full max-w-[400px] justify-center" />
                      )}
                      {mode === 'staff' && APPLE_CLIENT_ID && (
                        <button
                          type="button"
                          onClick={handleApple}
                          disabled={busy}
                          className="flex h-10 w-full max-w-[400px] items-center justify-center gap-2 rounded
                                     border border-[#dadce0] bg-white text-sm font-medium text-[#1f1f1f]
                                     transition-colors hover:bg-[#f8f9fa] focus:outline-none
                                     focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
                          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif' }}
                        >
                          <svg viewBox="0 0 814 1000" className="h-4 w-4 fill-current" aria-hidden="true">
                            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
                          </svg>
                          Continue with Apple
                        </button>
                      )}
                      {mode === 'guest' && GOOGLE_CLIENT_ID && (
                        <p className="text-xs text-ink/55">Use the Google account with the email you booked with.</p>
                      )}
                    </div>

                    {pending === 'oauth' && (
                      <p className="mt-3 flex items-center justify-center gap-2 text-sm text-ink/70">
                        <LoaderCircle className="h-4 w-4 animate-spin text-clay" aria-hidden="true" />
                        Signing in…
                      </p>
                    )}

                    <footer className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-8 text-xs text-ink/60">
                      {mode === 'guest' ? (
                        <p>
                          No booking yet?{' '}
                          <a
                            href="https://cestlastay.com/"
                            className="font-medium text-clay underline-offset-2 hover:text-clay-dark hover:underline"
                          >
                            Book a stay →
                          </a>
                        </p>
                      ) : (
                        <p>Need access? Ask an administrator.</p>
                      )}
                      <nav aria-label="Legal" className="flex gap-3">
                        <a href="https://cestlastay.com/privacy" target="_blank" rel="noopener" className="hover:text-ink">
                          Privacy
                        </a>
                        <a href="https://cestlastay.com/terms" target="_blank" rel="noopener" className="hover:text-ink">
                          Terms
                        </a>
                      </nav>
                    </footer>
                  </section>

                  <ShowcasePanel mode={mode} autoplay={richMotion} />
                  <div className="login-sheen" aria-hidden="true" />
                </div>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
