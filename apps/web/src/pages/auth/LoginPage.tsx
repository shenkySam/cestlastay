import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@shared/index';
import {
  APPLE_CLIENT_ID,
  GOOGLE_CLIENT_ID,
  OAuthProvider,
  renderGoogleButton,
  signInWithApple,
} from '@/lib/oauth';

const ROLE_HOME: Record<UserRole, string> = {
  [UserRole.ADMIN]: '/admin',
  [UserRole.STAFF]: '/staff',
  [UserRole.GUEST]: '/guest-portal',
};

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Already logged in → redirect
  useEffect(() => {
    if (user) navigate(ROLE_HOME[user.role], { replace: true });
  }, [user, navigate]);

  const finishSignIn = async (provider: OAuthProvider, idToken: string) => {
    setError('');
    setSubmitting(true);
    try {
      await login(provider, idToken);
      // AuthContext sets user → useEffect above redirects
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? 'Sign-in failed — please try again'));
    } finally {
      setSubmitting(false);
    }
  };
  // Google's button is rendered once; route its callback through a ref so it
  // always reaches the latest finishSignIn.
  const finishSignInRef = useRef(finishSignIn);
  finishSignInRef.current = finishSignIn;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) return;
    renderGoogleButton(googleButtonRef.current, (idToken) =>
      finishSignInRef.current('google', idToken),
    ).catch(() => setError('Could not load Google sign-in. Check your connection and refresh.'));
  }, []);

  const handleApple = async () => {
    setError('');
    try {
      const idToken = await signInWithApple();
      if (idToken) await finishSignIn('apple', idToken);
    } catch {
      setError('Apple sign-in failed — please try again.');
    }
  };

  const noProviders = !GOOGLE_CLIENT_ID && !APPLE_CLIENT_ID;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ fontFamily: '"Jost", ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* Background — softly-blurred HeroMain with a warm cream/clay scrim */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 scale-105 bg-[url('/heroMain.png')] bg-cover bg-center blur-[6px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#f4efe5]/30 via-[#3a2a1f]/35 to-[#3a2a1f]/60" />
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo.png" alt="C'est La Stay" className="w-40 h-auto drop-shadow-xl" />
          </div>
          <p
            className="mt-1 text-lg text-white/90 drop-shadow"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
          >
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div className="login-card p-8">
          <div className="space-y-5">
            {error && (
              <div className="bg-red-500/15 border border-red-400/40 text-red-900 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <p className="text-sm text-center text-[#3a2a1f]/80">
              Use the Google or Apple account your administrator registered for you.
            </p>

            {noProviders ? (
              <p className="text-sm text-center text-[#3a2a1f]/80">
                {import.meta.env.DEV
                  ? 'Sign-in is not configured — set VITE_GOOGLE_CLIENT_ID and/or VITE_APPLE_CLIENT_ID.'
                  : 'Sign-in is temporarily unavailable.'}
              </p>
            ) : (
              <div
                className={`space-y-3 ${submitting ? 'opacity-50 pointer-events-none' : ''}`}
                aria-busy={submitting}
              >
                {GOOGLE_CLIENT_ID && (
                  <div ref={googleButtonRef} className="flex justify-center min-h-[40px]" />
                )}

                {APPLE_CLIENT_ID && (
                  <button
                    type="button"
                    onClick={handleApple}
                    disabled={submitting}
                    className="mx-auto flex h-10 w-full max-w-[400px] items-center justify-center gap-2
                               rounded-full bg-black text-[15px] font-medium text-white transition-colors
                               hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-black/40
                               focus:ring-offset-2"
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif' }}
                  >
                    <svg viewBox="0 0 814 1000" className="h-4 w-4 fill-current" aria-hidden="true">
                      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
                    </svg>
                    Sign in with Apple
                  </button>
                )}
              </div>
            )}

            {submitting && (
              <p className="flex items-center justify-center gap-2 text-sm text-[#3a2a1f]/80">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#b1542e]" />
                Signing in…
              </p>
            )}
          </div>

          {/* Guest access hint */}
          <div className="mt-6 pt-6 border-t border-[#3a2a1f]/15 text-center">
            <p className="text-xs text-[#3a2a1f]/70">
              Guest?{' '}
              <a
                href="/guest-portal"
                className="font-medium text-[#b1542e] underline hover:text-[#8a3f20]"
              >
                Access your booking
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
