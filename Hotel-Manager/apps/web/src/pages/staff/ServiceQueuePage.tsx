import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSocket } from '@/contexts/SocketContext';
import { ServiceType, ServiceStatus } from '@shared/index';

interface ServiceRequest {
  id: string;
  ticketNumber: string;
  type: ServiceType;
  status: ServiceStatus;
  priority: number;
  description: string;
  notes?: string;
  estimatedCost?: number | null;
  actualCost?: number | null;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  guest: { id: string; firstName: string; lastName: string; email: string };
  booking?: { bookingNumber: string; rooms?: { room: { roomNumber: string } }[] };
  assignedTo?: { id: string; user: { firstName: string; lastName: string } };
}

const STATUS_BADGE: Record<ServiceStatus, string> = {
  [ServiceStatus.PENDING]: 'badge-yellow',
  [ServiceStatus.IN_PROGRESS]: 'badge-blue',
  [ServiceStatus.COMPLETED]: 'badge-green',
  [ServiceStatus.CANCELLED]: 'badge-red',
};

const PRIORITY_LABEL: Record<number, string> = { 1: 'Low', 2: 'Normal', 3: 'High', 4: 'Urgent', 5: 'Critical' };
const PRIORITY_COLOR: Record<number, string> = {
  1: 'text-gray-500', 2: 'text-blue-600', 3: 'text-yellow-600', 4: 'text-orange-600', 5: 'text-red-600',
};

// Unfinished tickets (still need attention) float to the top of the queue.
const ACTIVE_STATUSES: ServiceStatus[] = [ServiceStatus.PENDING, ServiceStatus.IN_PROGRESS];

export default function StaffServiceQueuePage() {
  const { socket } = useSocket();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [costDraft, setCostDraft] = useState('');
  const [savingCost, setSavingCost] = useState(false);

  useEffect(() => { load(); loadStaff(); }, [filterStatus]);

  useEffect(() => {
    const cost = selected?.actualCost ?? selected?.estimatedCost;
    setCostDraft(cost != null ? String(Number(cost)) : '');
  }, [selected?.id]);

  useEffect(() => {
    if (!socket) return;
    socket.on('notification:new', (n: any) => {
      if (n.type === 'SERVICE_REQUEST') load();
    });
    return () => { socket.off('notification:new'); };
  }, [socket]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/services', {
        params: filterStatus ? { status: filterStatus } : {},
      });
      // Active tickets (PENDING/IN_PROGRESS) first, then newest-first within each group.
      setRequests(
        [...data].sort((a: ServiceRequest, b: ServiceRequest) => {
          const aActive = ACTIVE_STATUSES.includes(a.status) ? 0 : 1;
          const bActive = ACTIVE_STATUSES.includes(b.status) ? 0 : 1;
          if (aActive !== bActive) return aActive - bActive;
          return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
        }),
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadStaff() {
    const { data } = await api.get('/users/staff-list');
    setStaffList(data);
  }

  async function updateStatus(sr: ServiceRequest, status: ServiceStatus) {
    try {
      const { data } = await api.patch(`/services/${sr.id}`, { status });
      setRequests((prev) => prev.map((r) => (r.id === sr.id ? data : r)));
      if (selected?.id === sr.id) setSelected(data);
      toast.success(`Ticket ${sr.ticketNumber} → ${status.replace('_', ' ')}`);
    } catch {
      // errors shown by interceptor
    }
  }

  async function assignTo(sr: ServiceRequest, staffId: string) {
    setAssigningId(sr.id);
    try {
      const { data } = await api.patch(`/services/${sr.id}`, {
        assignedToId: staffId || null,
        status: staffId ? ServiceStatus.IN_PROGRESS : ServiceStatus.PENDING,
      });
      setRequests((prev) => prev.map((r) => (r.id === sr.id ? data : r)));
      if (selected?.id === sr.id) setSelected(data);
      toast.success(staffId ? 'Assigned' : 'Unassigned');
    } catch {
      // errors shown by interceptor
    } finally {
      setAssigningId(null);
    }
  }

  async function saveCost(sr: ServiceRequest) {
    setSavingCost(true);
    try {
      const { data } = await api.patch(`/services/${sr.id}`, {
        actualCost: parseFloat(costDraft) || 0,
      });
      setRequests((prev) => prev.map((r) => (r.id === sr.id ? data : r)));
      setSelected(data);
      toast.success('Cost saved — ready to bill from the folio');
    } catch {
      // errors shown by interceptor
    } finally {
      setSavingCost(false);
    }
  }

  const pending = requests.filter((r) => r.status === ServiceStatus.PENDING).length;
  const inProgress = requests.filter((r) => r.status === ServiceStatus.IN_PROGRESS).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Service Queue</h2>
        <p className="text-gray-500 text-sm mt-1">
          {pending} pending · {inProgress} in progress
        </p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['', ...Object.values(ServiceStatus)].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
              filterStatus === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ticket list */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">No service requests.</div>
          ) : (
            requests.map((sr) => (
              <div
                key={sr.id}
                onClick={() => setSelected(sr)}
                className={`card p-4 cursor-pointer transition-all hover:shadow-md space-y-2 ${
                  selected?.id === sr.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-blue-700">{sr.ticketNumber}</span>
                    <span className={`badge ${STATUS_BADGE[sr.status]}`}>{sr.status.replace('_', ' ')}</span>
                    <span className="badge badge-gray">{sr.type.replace('_', ' ')}</span>
                  </div>
                  <span className={`text-xs font-semibold ${PRIORITY_COLOR[sr.priority] ?? 'text-gray-500'}`}>
                    {PRIORITY_LABEL[sr.priority] ?? sr.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-800">{sr.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {sr.guest.firstName} {sr.guest.lastName}
                    {!!sr.booking?.rooms?.length &&
                      ` · Room ${sr.booking.rooms.map((r) => `#${r.room.roomNumber}`).join(', ')}`}
                  </span>
                  <span>{format(new Date(sr.requestedAt), 'dd MMM HH:mm')}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div>
          {!selected ? (
            <div className="card p-6 text-center text-gray-400 text-sm">
              Select a ticket to manage it.
            </div>
          ) : (
            <div className="card p-5 space-y-4 sticky top-4">
              <div>
                <p className="font-mono text-xs text-blue-700">{selected.ticketNumber}</p>
                <h3 className="font-semibold text-gray-900 mt-0.5">{selected.type.replace('_', ' ')}</h3>
              </div>

              <div className="text-sm space-y-2">
                <div><span className="text-gray-500">Guest: </span>{selected.guest.firstName} {selected.guest.lastName}</div>
                {selected.booking && (
                  <div><span className="text-gray-500">Booking: </span>{selected.booking.bookingNumber}</div>
                )}
                {!!selected.booking?.rooms?.length && (
                  <div>
                    <span className="text-gray-500">Room: </span>
                    {selected.booking.rooms.map((r) => `#${r.room.roomNumber}`).join(', ')}
                  </div>
                )}
                <div><span className="text-gray-500">Priority: </span>
                  <span className={PRIORITY_COLOR[selected.priority]}>{PRIORITY_LABEL[selected.priority]}</span>
                </div>
                <div className="pt-1"><p className="text-gray-500 text-xs mb-1">Description</p>
                  <p className="text-gray-800">{selected.description}</p>
                </div>
                {selected.notes && (
                  <div><p className="text-gray-500 text-xs mb-1">Staff Notes</p>
                    <p className="text-gray-700">{selected.notes}</p>
                  </div>
                )}
              </div>

              {/* Price the service — pulled onto the guest folio by billing staff */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cost (billable to guest)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="input text-sm flex-1"
                    placeholder="0.00"
                    value={costDraft}
                    onChange={(e) => setCostDraft(e.target.value)}
                  />
                  <button
                    className="btn-secondary text-sm"
                    disabled={savingCost || costDraft === ''}
                    onClick={() => saveCost(selected)}
                  >
                    {savingCost ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {selected.actualCost != null && (
                  <p className="text-xs text-gray-400 mt-1">
                    Current: ${Number(selected.actualCost).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Assign to staff */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Assign To</label>
                <div className="relative">
                  <select
                    className="input text-sm w-full"
                    value={selected.assignedTo?.id ?? ''}
                    disabled={assigningId === selected.id}
                    onChange={(e) => assignTo(selected, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.staff?.id ?? ''}>
                        {s.firstName} {s.lastName}
                        {s.staff?.department ? ` — ${s.staff.department}` : ''}
                      </option>
                    ))}
                  </select>
                  {assigningId === selected.id && (
                    <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
                      <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Status actions */}
              <div className="flex flex-col gap-2">
                {selected.status === ServiceStatus.PENDING && (
                  <button
                    className="btn-primary"
                    onClick={() => updateStatus(selected, ServiceStatus.IN_PROGRESS)}
                  >
                    Start Working
                  </button>
                )}
                {selected.status === ServiceStatus.IN_PROGRESS && (
                  <button
                    className="btn-primary"
                    onClick={() => updateStatus(selected, ServiceStatus.COMPLETED)}
                  >
                    Mark Completed
                  </button>
                )}
                {[ServiceStatus.PENDING, ServiceStatus.IN_PROGRESS].includes(selected.status) && (
                  <button
                    className="btn-secondary"
                    onClick={() => updateStatus(selected, ServiceStatus.CANCELLED)}
                  >
                    Cancel Request
                  </button>
                )}
              </div>

              <div className="text-xs text-gray-400 pt-1 border-t border-gray-100">
                Requested: {format(new Date(selected.requestedAt), 'dd MMM yyyy HH:mm')}
                {selected.completedAt && (
                  <><br />Completed: {format(new Date(selected.completedAt), 'dd MMM yyyy HH:mm')}</>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
