import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const ACTIONS = [
  { label: 'Request Service',   icon: '🛎', href: '/guest/services' },
  { label: 'File a Complaint',  icon: '📝', href: '/guest/complaints' },
  { label: 'View My Bill',      icon: '💳', href: '/guest/bill' },
  { label: 'Express Check-out', icon: '🚪', href: '/guest/bill' },
];

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="text-2xl transition-transform hover:scale-110"
        >
          <span className={(hover || value) >= star ? 'text-yellow-400' : 'text-gray-300'}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

export default function GuestHomePage() {
  const { user } = useAuth();
  const [showRating, setShowRating] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [roomRating, setRoomRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  const bookingId = (user as any)?.bookingId;

  // Check if the guest has already submitted a rating for this booking
  useEffect(() => {
    if (!bookingId) return;
    api
      .get(`/ratings/booking/${bookingId}`)
      .then(({ data }) => { if (data) setAlreadyRated(true); })
      .catch(() => {});
  }, [bookingId]);

  async function submitRating() {
    if (!overallRating || !roomRating || !bookingId) return;
    setSubmitting(true);
    try {
      await api.post('/ratings', { bookingId, overallRating, roomRating, comment: comment.trim() || undefined });
      toast.success('Thank you for your feedback!');
      setAlreadyRated(true);
      setShowRating(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Welcome, {user?.firstName}!
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          How can we make your stay more comfortable?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((action) => (
          <Link
            key={action.label}
            to={action.href}
            className="card p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-shadow"
          >
            <span className="text-3xl">{action.icon}</span>
            <span className="text-sm font-medium text-gray-700">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Rate Your Stay card */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="font-medium text-gray-900">Rate Your Stay</p>
            <p className="text-xs text-gray-500">Help us improve with your honest feedback</p>
          </div>
        </div>
        {alreadyRated ? (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            ✓ You've already submitted your rating. Thank you!
          </p>
        ) : (
          <button
            className="btn-primary w-full"
            onClick={() => setShowRating(true)}
          >
            Leave a Rating
          </button>
        )}
      </div>

      {/* Rating modal */}
      {showRating && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Rate Your Stay</h3>
              <p className="text-sm text-gray-500 mt-0.5">Your feedback means a lot to us</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Overall experience
                </label>
                <StarPicker value={overallRating} onChange={setOverallRating} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Room quality &amp; cleanliness
                </label>
                <StarPicker value={roomRating} onChange={setRoomRating} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Tell us what you loved or how we can improve..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="btn-primary flex-1"
                disabled={!overallRating || !roomRating || submitting}
                onClick={submitRating}
              >
                {submitting ? 'Submitting...' : 'Submit Rating'}
              </button>
              <button
                className="btn-secondary flex-1"
                onClick={() => {
                  setShowRating(false);
                  setOverallRating(0);
                  setRoomRating(0);
                  setComment('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
