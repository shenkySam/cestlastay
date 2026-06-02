import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { HousekeepingStatus } from '@shared/index';

interface HousekeepingTask {
  id: string;
  taskType: string;
  status: HousekeepingStatus;
  priority: number;
  notes?: string;
  scheduledFor: string;
  startedAt?: string;
  completedAt?: string;
  inspectedAt?: string;
  room: { id: string; roomNumber: string; floor: number };
  assignedTo?: { id: string; user: { firstName: string; lastName: string } };
}

const STATUS_BADGE: Record<HousekeepingStatus, string> = {
  [HousekeepingStatus.PENDING]: 'badge-yellow',
  [HousekeepingStatus.IN_PROGRESS]: 'badge-blue',
  [HousekeepingStatus.COMPLETED]: 'badge-green',
  [HousekeepingStatus.INSPECTED]: 'badge-gray',
};

const TASK_LABEL: Record<string, string> = {
  checkout_cleaning: 'Checkout Clean',
  daily_cleaning: 'Daily Clean',
  deep_cleaning: 'Deep Clean',
};

const NEXT_STATUS: Partial<Record<HousekeepingStatus, HousekeepingStatus>> = {
  [HousekeepingStatus.PENDING]: HousekeepingStatus.IN_PROGRESS,
  [HousekeepingStatus.IN_PROGRESS]: HousekeepingStatus.COMPLETED,
  [HousekeepingStatus.COMPLETED]: HousekeepingStatus.INSPECTED,
};

const NEXT_LABEL: Partial<Record<HousekeepingStatus, string>> = {
  [HousekeepingStatus.PENDING]: 'Start Cleaning',
  [HousekeepingStatus.IN_PROGRESS]: 'Mark Completed',
  [HousekeepingStatus.COMPLETED]: 'Mark Inspected (→ Room Available)',
};

export default function StaffHousekeepingPage() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [form, setForm] = useState({ roomId: '', taskType: 'daily_cleaning', scheduledFor: new Date().toISOString().split('T')[0], notes: '', priority: 1 });

  useEffect(() => { load(); loadStaff(); loadRooms(); }, [filterStatus]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/housekeeping', {
        params: filterStatus ? { status: filterStatus } : {},
      });
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }

  async function loadStaff() {
    const { data } = await api.get('/users/staff-list');
    setStaffList(data);
  }

  async function loadRooms() {
    const { data } = await api.get('/rooms');
    setRooms(data);
  }

  async function advance(task: HousekeepingTask) {
    const next = NEXT_STATUS[task.status];
    if (!next) return;
    try {
      const { data } = await api.patch(`/housekeeping/${task.id}`, { status: next });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
      toast.success(`Room #${task.room.roomNumber} → ${next.replace('_', ' ')}`);
    } catch {
      // errors shown by interceptor
    }
  }

  async function assign(task: HousekeepingTask, staffId: string) {
    setAssigningId(task.id);
    try {
      const { data } = await api.patch(`/housekeeping/${task.id}`, { assignedToId: staffId || null });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
      toast.success('Assigned');
    } catch {
      // errors shown by interceptor
    } finally {
      setAssigningId(null);
    }
  }

  async function handleCreate() {
    try {
      await api.post('/housekeeping', { ...form, scheduledFor: new Date(form.scheduledFor).toISOString() });
      toast.success('Task created');
      setShowCreate(false);
      load();
    } catch {
      // errors shown by interceptor
    }
  }

  const pending = tasks.filter((t) => t.status === HousekeepingStatus.PENDING).length;
  const inProgress = tasks.filter((t) => t.status === HousekeepingStatus.IN_PROGRESS).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Housekeeping</h2>
          <p className="text-gray-500 text-sm mt-1">{pending} pending · {inProgress} in progress</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New Task</button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', ...Object.values(HousekeepingStatus)].map((s) => (
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

      {/* Task grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">No housekeeping tasks.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">Room #{task.room.roomNumber}</span>
                <span className={`badge ${STATUS_BADGE[task.status]}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>

              <div className="text-sm text-gray-600 space-y-0.5">
                <p className="font-medium">{TASK_LABEL[task.taskType] ?? task.taskType}</p>
                <p className="text-gray-400">Floor {task.room.floor}</p>
                <p className="text-gray-400">
                  Scheduled: {format(new Date(task.scheduledFor), 'dd MMM HH:mm')}
                </p>
                {task.notes && <p className="text-gray-500 italic">{task.notes}</p>}
              </div>

              {/* Assign */}
              <div className="relative">
                <select
                  className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white"
                  value={task.assignedTo?.id ?? ''}
                  disabled={assigningId === task.id}
                  onChange={(e) => assign(task, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.staff?.id ?? ''}>
                      {s.firstName} {s.lastName}
                      {s.staff?.department ? ` — ${s.staff.department}` : ''}
                    </option>
                  ))}
                </select>
                {assigningId === task.id && (
                  <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none">
                    <svg className="animate-spin h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
              </div>

              {NEXT_STATUS[task.status] && (
                <button
                  className="btn-primary w-full text-sm py-1.5"
                  onClick={() => advance(task)}
                >
                  {NEXT_LABEL[task.status]}
                </button>
              )}

              {task.status === HousekeepingStatus.INSPECTED && (
                <p className="text-xs text-green-600 font-medium text-center">
                  ✓ Inspected — room set to AVAILABLE
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create task modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">New Housekeeping Task</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <select className="input" value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
                <option value="">Select room</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>#{r.roomNumber} — Floor {r.floor} ({r.status})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
              <select className="input" value={form.taskType} onChange={(e) => setForm({ ...form, taskType: e.target.value })}>
                <option value="checkout_cleaning">Checkout Cleaning</option>
                <option value="daily_cleaning">Daily Cleaning</option>
                <option value="deep_cleaning">Deep Cleaning</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled For</label>
              <input type="date" className="input" value={form.scheduledFor}
                onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority (1–5)</label>
              <input type="number" className="input" min={1} max={5} value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea className="input" rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
            </div>

            <div className="flex gap-3">
              <button className="btn-primary flex-1" disabled={!form.roomId} onClick={handleCreate}>Create</button>
              <button className="btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
