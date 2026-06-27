import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@shared/index';

const ROLE_HOME: Record<UserRole, string> = {
  [UserRole.ADMIN]: '/admin',
  [UserRole.STAFF]: '/staff',
  [UserRole.GUEST]: '/guest-portal',
};

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Already logged in → redirect
  useEffect(() => {
    if (user) navigate(ROLE_HOME[user.role], { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      // AuthContext sets user → useEffect above redirects
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  };

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
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/15 border border-red-400/40 text-red-900 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#3a2a1f]/80 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                className="login-input"
                placeholder="you@hotel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#3a2a1f]/80 mb-1.5">
                Password
              </label>
              <input
                type="password"
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-btn w-full py-3" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

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

        {/* Dev hint (remove in production) */}
        {import.meta.env.DEV && (
          <div className="mt-4 login-card p-4 text-xs text-[#3a2a1f]/80 space-y-1">
            <p className="font-semibold text-[#3a2a1f]">Dev credentials</p>
            <p>Admin: admin@hotel.com / Admin123!</p>
            <p>Staff: staff@hotel.com / Staff123!</p>
            <p>Guest: guest@hotel.com / Guest123!</p>
          </div>
        )}
      </div>
    </div>
  );
}
