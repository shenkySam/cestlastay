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

export default function GuestServiceRequestPage() {
  const { user } = useAuth();
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<ServiceType | null>(null);
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

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
              <p className="text-xs text-gray-400">
                {format(new Date(sr.requestedAt), 'dd MMM yyyy HH:mm')}
                {sr.completedAt && ` · Completed ${format(new Date(sr.completedAt), 'HH:mm')}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* New request modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
            <h3 className="font-semibold text-gray-900 text-lg">New Service Request</h3>

            {/* Service type picker */}
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

            {/* Description */}
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
    </div>
  );
}
