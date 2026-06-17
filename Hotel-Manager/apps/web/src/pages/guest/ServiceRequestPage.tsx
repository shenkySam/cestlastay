import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ServiceType, ServiceStatus } from '@shared/index';

interface ServiceRequest {
  id: string;
  ticketNumber: string;
  type: ServiceType;
  status: ServiceStatus;
  priority: number;
  description: string;
  notes?: string;
  requestedAt: string;
  completedAt?: string;
  serviceRating?: number | null;
  ratedAt?: string | null;
}

const TYPE_ICONS: Record<ServiceType, string> = {
  [ServiceType.ROOM_SERVICE]: '🍽',
  [ServiceType.LAUNDRY]: '👕',
  [ServiceType.SPA]: '💆',
  [ServiceType.RESTAURANT]: '🍴',
  [ServiceType.MAINTENANCE]: '🔧',
  [ServiceType.CONCIERGE]: '🛎',
  [ServiceType.OTHER]: '📋',
};

const TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.ROOM_SERVICE]: 'Room Service',
  [ServiceType.LAUNDRY]: 'Laundry',
  [ServiceType.SPA]: 'Spa',
  [ServiceType.RESTAURANT]: 'Restaurant',
  [ServiceType.MAINTENANCE]: 'Maintenance',
  [ServiceType.CONCIERGE]: 'Concierge',
  [ServiceType.OTHER]: 'Other',
};

const STATUS_BADGE: Record<ServiceStatus, string> = {
  [ServiceStatus.PENDING]: 'badge-yellow',
  [ServiceStatus.IN_PROGRESS]: 'badge-blue',
  [ServiceStatus.COMPLETED]: 'badge-green',
  [ServiceStatus.CANCELLED]: 'badge-red',
};

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

function StarDisplay({ value }: { value: number }) {
  return (
    <span className="text-sm">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= value ? 'text-yellow-400' : 'text-gray-300'}>★</span>
      ))}
    </span>
  );
}

export default function GuestServiceRequestPage() {
  const { user } = useAuth();
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<ServiceType | null>(null);
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Rating modal state
  const [ratingTarget, setRatingTarget] = useState<ServiceRequest | null>(null);
  const [srRating, setSrRating] = useState(0);
  const [srComment, setSrComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const guestId = (user as any)?.guest?.id;

  useEffect(() => {
    if (guestId) loadRequests();
  }, [guestId]);

  async function loadRequests() {
    setLoading(true);
    try {
      const { data } = await api.get('/services', { params: { guestId } });
      setMyRequests(data);
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest() {
    if (!selectedType || !description.trim() || !guestId) return;
    setSubmitting(true);
    try {
      await api.post('/services', {
        guestId,
        type: selectedType,
        description: description.trim(),
      });
      toast.success('Request submitted! Our team will attend to you shortly.');
      setShowForm(false);
      setSelectedType(null);
      setDescription('');
      loadRequests();
    } finally {
      setSubmitting(false);
    }
  }

  async function submitServiceRating() {
    if (!ratingTarget || !srRating) return;
    setRatingSubmitting(true);
    try {
      await api.post(`/services/${ratingTarget.id}/rate`, {
        rating: srRating,
        comment: srComment.trim() || undefined,
      });
      toast.success('Thanks for rating this service!');
      setRatingTarget(null);
      setSrRating(0);
      setSrComment('');
      loadRequests();
    } finally {
      setRatingSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Request a Service</h2>
          <p className="text-gray-500 text-sm mt-1">Our team will respond promptly.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ New Request</button>
      </div>

      {/* My requests */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : myRequests.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-3xl mb-2">🛎</p>
          <p>No service requests yet. Tap "+ New Request" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myRequests.map((sr) => (
            <div key={sr.id} className="card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{TYPE_ICONS[sr.type]}</span>
                  <span className="font-medium">{TYPE_LABELS[sr.type]}</span>
                  <span className="font-mono text-xs text-gray-400">{sr.ticketNumber}</span>
                </div>
                <span className={`badge ${STATUS_BADGE[sr.status]}`}>
                  {sr.status.replace('_', ' ')}
                </span>
              </div>

              <p className="text-sm text-gray-700">{sr.description}</p>

              {sr.notes && (
                <p className="text-sm text-blue-700 bg-blue-50 rounded px-3 py-1.5">
                  Staff note: {sr.notes}
                </p>
              )}

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-400">
                  {format(new Date(sr.requestedAt), 'dd MMM yyyy HH:mm')}
                  {sr.completedAt && ` · Completed ${format(new Date(sr.completedAt), 'HH:mm')}`}
                </p>

                {/* Rating area */}
                {sr.status === ServiceStatus.COMPLETED && (
                  sr.serviceRating ? (
                    <div className="flex items-center gap-1.5">
                      <StarDisplay value={sr.serviceRating} />
                      <span className="text-xs text-gray-400">Rated</span>
                    </div>
                  ) : (
                    <button
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2"
                      onClick={() => { setRatingTarget(sr); setSrRating(0); setSrComment(''); }}
                    >
                      Rate this service
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New request modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
            <h3 className="font-semibold text-gray-900 text-lg">New Service Request</h3>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">What do you need?</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(ServiceType).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedType(t)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-xs font-medium transition-colors ${
                      selectedType === t
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{TYPE_ICONS[t]}</span>
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Describe your request
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="e.g. Please bring extra towels and mineral water"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                className="btn-primary flex-1"
                disabled={!selectedType || !description.trim() || submitting}
                onClick={submitRequest}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                className="btn-secondary flex-1"
                onClick={() => { setShowForm(false); setSelectedType(null); setDescription(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service rating modal */}
      {ratingTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Rate this Service</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {TYPE_ICONS[ratingTarget.type]} {TYPE_LABELS[ratingTarget.type]} · {ratingTarget.ticketNumber}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  How satisfied were you?
                </label>
                <StarPicker value={srRating} onChange={setSrRating} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Any specific feedback?"
                  value={srComment}
                  onChange={(e) => setSrComment(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="btn-primary flex-1"
                disabled={!srRating || ratingSubmitting}
                onClick={submitServiceRating}
              >
                {ratingSubmitting ? 'Submitting...' : 'Submit'}
              </button>
              <button
                className="btn-secondary flex-1"
                onClick={() => setRatingTarget(null)}
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
