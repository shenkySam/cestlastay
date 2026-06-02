import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@shared/index';
import { AuthBackground } from '@/components/layouts/AuthBackground';

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <AuthBackground />
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo.png" alt="C'est La Stay" className="w-40 h-auto drop-shadow-xl" />
          </div>
          <p className="text-accent-50 mt-1 text-sm">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="card-glass p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/20 border border-red-300/40 text-red-50 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/90 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                className="input-glass"
                placeholder="you@hotel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-1.5">
                Password
              </label>
              <input
                type="password"
                className="input-glass"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
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
          <div className="mt-6 pt-6 border-t border-white/20 text-center">
            <p className="text-xs text-white/70">
              Guest?{' '}
              <a href="/guest-portal" className="text-white underline hover:text-white font-medium">
                Access your booking
              </a>
            </p>
          </div>
        </div>

        {/* Dev hint (remove in production) */}
        {import.meta.env.DEV && (
          <div className="mt-4 card-glass p-4 text-xs text-white/80 space-y-1">
            <p className="font-semibold text-white/90">Dev credentials</p>
            <p>Admin: admin@hotel.com / Admin123!</p>
            <p>Staff: staff@hotel.com / Staff123!</p>
            <p>Guest: guest@hotel.com / Guest123!</p>
          </div>
        )}
      </div>
    </div>
  );
}
