import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_HOME } from '@/lib/roleHome';
import { UserRole } from '@shared/index';

/**
 * Landing-site handoff: after a guest books and enters the emailed code on
 * cestlastay.com, they're sent here with a one-time code in the URL fragment
 * (#code=…). Exchange it for a guest session and go straight to the portal.
 */
export default function GuestContinuePage() {
  const { guestHandoffLogin } = useAuth();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  // The code is single-use: StrictMode's double effect must not spend it twice
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = new URLSearchParams(window.location.hash.slice(1)).get('code');
    // Drop the code from the address bar and history right away
    window.history.replaceState(null, '', window.location.pathname);

    if (!code) {
      navigate('/login?as=guest', { replace: true });
      return;
    }
    guestHandoffLogin(code)
      .then(() => navigate(ROLE_HOME[UserRole.GUEST], { replace: true }))
      .catch(() => setFailed(true));
  }, [guestHandoffLogin, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-50 px-4 font-jost text-ink">
      {failed ? (
        <div className="max-w-sm text-center">
          <h1 className="font-cormorant text-3xl font-semibold">This link has expired</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Sign-in links work once and only for a minute. Sign in with the email you booked with and we’ll send
            you a fresh code.
          </p>
          <Link
            to="/login?as=guest"
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-medium text-cream"
          >
            Go to sign-in
          </Link>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-ink/70" role="status">
          <LoaderCircle className="h-5 w-5 animate-spin text-clay" aria-hidden="true" />
          Opening your stay…
        </p>
      )}
    </div>
  );
}
