import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthBackground } from '@/components/layouts/AuthBackground';

export default function GuestPortalPage() {
  const { guestLogin } = useAuth();
  const navigate = useNavigate();

  const [bookingNumber, setBookingNumber] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await guestLogin(bookingNumber, lastName);
      navigate('/guest/home');
    } catch {
      setError('Booking not found. Please check your booking number and last name.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AuthBackground />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center">
            <img src="/logo.png" alt="C'est La Stay" className="w-40 h-auto drop-shadow-xl" />
          </div>
          <h1 className="text-3xl font-bold text-white mt-4">Guest Portal</h1>
          <p className="text-accent-50 mt-1 text-sm">Enter your booking details to get started</p>
        </div>

        <div className="card-glass p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/20 border border-red-300/40 text-red-50 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/90 mb-1.5">
                Booking Number
              </label>
              <input
                type="text"
                className="input-glass"
                placeholder="BKG-20260501-0001"
                value={bookingNumber}
                onChange={(e) => setBookingNumber(e.target.value.toUpperCase())}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                className="input-glass"
                placeholder="Smith"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Searching…
                </span>
              ) : (
                'Access My Booking'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/20 text-center">
            <p className="text-xs text-white/70">
              Staff?{' '}
              <a href="/login" className="text-white underline hover:text-white font-medium">
                Sign in here
              </a>
            </p>
          </div>
        </div>

        {import.meta.env.DEV && (
          <div className="mt-4 card-glass p-4 text-xs text-white/80 space-y-1">
            <p className="font-semibold text-white/90">Dev credentials</p>
            <p>Booking Number: BKG-20260501-0001</p>
            <p>Last Name: Smith</p>
          </div>
        )}
      </div>
    </div>
  );
}
