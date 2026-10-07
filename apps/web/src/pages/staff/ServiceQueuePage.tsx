import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSocket } from '@/contexts/SocketContext';
import { ServiceType, ServiceStatus } from '@shared/index';
import clsx from 'clsx';
import { BellRingingIcon, CursorClickIcon } from '@phosphor-icons/react';
import {
  EmptyState,
  FilterPills,
  PageHeader,
  Panel,
  Skeleton,
  StatusDot,
  humanize,
  money,
} from '@/components/admin/ui';
import type { SegmentOption, Tone } from '@/components/admin/ui';

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
const PRIORITY_TONE: Record<number, Tone> = { 1: 'zinc', 2: 'lagoon', 3: 'amber', 4: 'rose', 5: 'rose' };

const FILTER_OPTIONS: SegmentOption<string>[] = [
  { value: '', label: 'All' },
  ...Object.values(ServiceStatus).map((s) => ({ value: s, label: humanize(s) })),
];

function Priority({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600">
      <StatusDot tone={PRIORITY_TONE[level] ?? 'zinc'} pulse={level >= 5} />
      {PRIORITY_LABEL[level] ?? level}
    </span>
  );
}

function roomsLabel(sr: ServiceRequest) {
  return sr.booking?.rooms?.map((r) => `#${r.room.roomNumber}`).join(', ');
}

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
    const onNotification = (n: any) => {
      if (n.type === 'SERVICE_REQUEST') load();
    };
    socket.on('notification:new', onNotification);
    // Remove only this listener — NotificationContext listens on the same event
    return () => { socket.off('notification:new', onNotification); };
  }, [socket]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/services', {
        params: filterStatus ? { status: filterStatus } : {},
      });
      // Active tickets (PENDING/IN_PROGRESS) first, then by priority descending, then oldest first.
      setRequests(
        [...data].sort((a: ServiceRequest, b: ServiceRequest) => {
          const aActive = ACTIVE_STATUSES.includes(a.status) ? 0 : 1;
          const bActive = ACTIVE_STATUSES.includes(b.status) ? 0 : 1;
          if (aActive !== bActive) return aActive - bActive;
          if (b.priority !== a.priority) return b.priority - a.priority;
          return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
        }),
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadStaff() {
    try {
      const { data } = await api.get('/users/staff-list');
      setStaffList(data);
    } catch {
      // errors shown by interceptor; assign dropdown degrades to empty
    }
  }

  async function updateStatus(sr: ServiceRequest, status: ServiceStatus) {
    try {
      const { data } = await api.patch(`/services/${sr.id}`, { status });
      setRequests((prev) => prev.map((r) => (r.id === sr.id ? data : r)));
      if (selected?.id === sr.id) setSelected(data);
      toast.success(`Ticket ${sr.ticketNumber} → ${humanize(status)}`);
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
      toast.success('Cost saved. It can now be billed from the folio.');
    } catch {
      // errors shown by interceptor
    } finally {
      setSavingCost(false);
    }
  }

  const pending = requests.filter((r) => r.status === ServiceStatus.PENDING).length;
  const inProgress = requests.filter((r) => r.status === ServiceStatus.IN_PROGRESS).length;

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Service queue"
        description={
          <>
            <span className="font-mono tabular-nums text-zinc-700">{pending}</span> pending ·{' '}
            <span className="font-mono tabular-nums text-zinc-700">{inProgress}</span> in progress. New requests appear here live.
          </>
        }
      />

      <FilterPills
        options={FILTER_OPTIONS}
        value={filterStatus}
        onChange={setFilterStatus}
        layoutId="service-status"
        aria-label="Filter requests by status"
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {loading && requests.length === 0 ? (
            <div role="status" aria-label="Loading requests" className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-32 rounded-[2rem]" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <Panel>
              <EmptyState
                icon={BellRingingIcon}
                title={filterStatus ? `No ${humanize(filterStatus).toLowerCase()} requests` : 'No service requests'}
                description="Requests guests make from their portal show up here."
              />
            </Panel>
          ) : (
            requests.map((sr) => {
              const active = selected?.id === sr.id;
              const rooms = roomsLabel(sr);
              return (
                <button
                  key={sr.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(sr)}
                  className={clsx(
                    'block w-full space-y-3 rounded-[1.75rem] border bg-white p-5 text-left transition-[border-color,box-shadow] duration-200',
                    'shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_20px_40px_-15px_rgb(24_24_27/0.06)]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-lagoon-500/40',
                    active ? 'border-lagoon-300 ring-2 ring-lagoon-500/20' : 'border-zinc-200/60 hover:border-zinc-300',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-lagoon-700">{sr.ticketNumber}</span>
                      <span className={`badge ${STATUS_BADGE[sr.status]}`}>{humanize(sr.status)}</span>
                      <span className="badge badge-gray">{humanize(sr.type)}</span>
                    </div>
                    <Priority level={sr.priority} />
                  </div>
                  <p className="text-sm text-zinc-800">{sr.description}</p>
                  <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                    <span className="truncate">
                      {sr.guest.firstName} {sr.guest.lastName}
                      {rooms && <> · Room <span className="font-mono text-zinc-700">{rooms}</span></>}
                    </span>
                    <span className="shrink-0 font-mono tabular-nums">{format(new Date(sr.requestedAt), 'dd MMM HH:mm')}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:sticky lg:top-24">
          {!selected ? (
            <Panel>
              <EmptyState icon={CursorClickIcon} title="No ticket selected" description="Pick a request to assign it, price it or move it along." compact />
            </Panel>
          ) : (
            <Panel
              eyebrow={<span className="font-mono normal-case tracking-normal text-lagoon-700">{selected.ticketNumber}</span>}
              title={humanize(selected.type)}
              action={<span className={`badge ${STATUS_BADGE[selected.status]}`}>{humanize(selected.status)}</span>}
              bodyClassName="gap-5"
            >
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="col-span-2">
                  <dt className="text-xs text-zinc-500">Guest</dt>
                  <dd className="mt-0.5 font-medium text-zinc-900">{selected.guest.firstName} {selected.guest.lastName}</dd>
                </div>
                {selected.booking && (
                  <div>
                    <dt className="text-xs text-zinc-500">Booking</dt>
                    <dd className="mt-0.5 font-mono text-xs text-zinc-900">{selected.booking.bookingNumber}</dd>
                  </div>
                )}
                {roomsLabel(selected) && (
                  <div>
                    <dt className="text-xs text-zinc-500">Room</dt>
                    <dd className="mt-0.5 font-mono text-xs text-zinc-900">{roomsLabel(selected)}</dd>
                  </div>
                )}
                <div className="col-span-2">
                  <dt className="text-xs text-zinc-500">Priority</dt>
                  <dd className="mt-1"><Priority level={selected.priority} /></dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-zinc-500">Description</dt>
                  <dd className="mt-0.5 text-zinc-800">{selected.description}</dd>
                </div>
                {selected.notes && (
                  <div className="col-span-2">
                    <dt className="text-xs text-zinc-500">Staff notes</dt>
                    <dd className="mt-0.5 text-zinc-700">{selected.notes}</dd>
                  </div>
                )}
              </dl>

              {/* Price the service — pulled onto the guest folio by billing staff */}
              <div className="grid gap-2 border-t border-zinc-100 pt-5">
                <label htmlFor="service-cost" className="text-xs font-medium text-zinc-600">Cost (billable to guest)</label>
                <div className="flex gap-2">
                  <input
                    id="service-cost"
                    type="number"
                    min={0}
                    step="0.01"
                    className="input flex-1 font-mono"
                    placeholder="0.00"
                    value={costDraft}
                    onChange={(e) => setCostDraft(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={savingCost || costDraft === ''}
                    onClick={() => saveCost(selected)}
                  >
                    {savingCost ? 'Saving…' : 'Save'}
                  </button>
                </div>
                {selected.actualCost != null && (
                  <p className="text-xs text-zinc-500">
                    Current: <span className="font-mono tabular-nums text-zinc-700">{money(selected.actualCost, { cents: true })}</span>
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <label htmlFor="service-assignee" className="text-xs font-medium text-zinc-600">Assign to</label>
                <select
                  id="service-assignee"
                  className="input"
                  value={selected.assignedTo?.id ?? ''}
                  disabled={assigningId === selected.id}
                  onChange={(e) => assignTo(selected, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.staff?.id ?? ''}>
                      {s.firstName} {s.lastName}
                      {s.staff?.department ? ` · ${s.staff.department}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {[ServiceStatus.PENDING, ServiceStatus.IN_PROGRESS].includes(selected.status) && (
                <div className="flex flex-col gap-2">
                  {selected.status === ServiceStatus.PENDING && (
                    <button type="button" className="btn-primary" onClick={() => updateStatus(selected, ServiceStatus.IN_PROGRESS)}>
                      Start working
                    </button>
                  )}
                  {selected.status === ServiceStatus.IN_PROGRESS && (
                    <button type="button" className="btn-primary" onClick={() => updateStatus(selected, ServiceStatus.COMPLETED)}>
                      Mark completed
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => updateStatus(selected, ServiceStatus.CANCELLED)}
                  >
                    Cancel request
                  </button>
                </div>
              )}

              <p className="border-t border-zinc-100 pt-4 text-xs leading-relaxed text-zinc-500">
                Requested <span className="font-mono tabular-nums text-zinc-700">{format(new Date(selected.requestedAt), 'dd MMM yyyy, HH:mm')}</span>
                {selected.completedAt && (
                  <>
                    <br />
                    Completed <span className="font-mono tabular-nums text-zinc-700">{format(new Date(selected.completedAt), 'dd MMM yyyy, HH:mm')}</span>
                  </>
                )}
              </p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
