import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { HousekeepingStatus } from '@shared/index';
import { motion } from 'framer-motion';
import { BroomIcon, CheckCircleIcon, ClockIcon, NoteIcon, PlusIcon } from '@phosphor-icons/react';
import {
  EmptyState,
  FilterPills,
  Modal,
  ModalBody,
  ModalFooter,
  PageHeader,
  Panel,
  Skeleton,
  humanize,
  riseItem,
  stagger,
} from '@/components/admin/ui';
import type { SegmentOption } from '@/components/admin/ui';

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
  checkout_cleaning: 'Checkout clean',
  daily_cleaning: 'Daily clean',
  deep_cleaning: 'Deep clean',
};

const FILTER_OPTIONS: SegmentOption<string>[] = [
  { value: '', label: 'All' },
  ...Object.values(HousekeepingStatus).map((s) => ({ value: s, label: humanize(s) })),
];

const NEXT_STATUS: Partial<Record<HousekeepingStatus, HousekeepingStatus>> = {
  [HousekeepingStatus.PENDING]: HousekeepingStatus.IN_PROGRESS,
  [HousekeepingStatus.IN_PROGRESS]: HousekeepingStatus.COMPLETED,
  [HousekeepingStatus.COMPLETED]: HousekeepingStatus.INSPECTED,
};

const NEXT_LABEL: Partial<Record<HousekeepingStatus, string>> = {
  [HousekeepingStatus.PENDING]: 'Start cleaning',
  [HousekeepingStatus.IN_PROGRESS]: 'Mark completed',
  [HousekeepingStatus.COMPLETED]: 'Mark inspected',
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
      toast.success(`Room ${task.room.roomNumber} → ${humanize(next)}`);
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
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Housekeeping"
        description={
          <>
            <span className="font-mono tabular-nums text-zinc-700">{pending}</span> pending ·{' '}
            <span className="font-mono tabular-nums text-zinc-700">{inProgress}</span> in progress
          </>
        }
        actions={
          <button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>
            <PlusIcon size={16} weight="regular" aria-hidden />
            New task
          </button>
        }
      />

      <FilterPills
        options={FILTER_OPTIONS}
        value={filterStatus}
        onChange={setFilterStatus}
        layoutId="housekeeping-status"
        aria-label="Filter tasks by status"
      />

      {loading ? (
        <div role="status" aria-label="Loading tasks" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-[2rem]" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Panel>
          <EmptyState
            icon={BroomIcon}
            title={filterStatus ? `No ${humanize(filterStatus).toLowerCase()} tasks` : 'No housekeeping tasks'}
            description="Checkouts create cleaning tasks automatically. You can also add one by hand."
          />
        </Panel>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <Panel key={task.id} variants={riseItem} flush bodyClassName="gap-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-mono text-2xl font-medium leading-none tracking-tight text-zinc-950">
                    <span className="sr-only">Room </span>
                    {task.room.roomNumber}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-zinc-700">{TASK_LABEL[task.taskType] ?? humanize(task.taskType)}</p>
                </div>
                <span className={`badge shrink-0 ${STATUS_BADGE[task.status]}`}>{humanize(task.status)}</span>
              </div>

              <div className="space-y-1.5 text-xs text-zinc-500">
                <p className="flex items-center gap-1.5">
                  <ClockIcon size={14} weight="regular" aria-hidden className="text-zinc-400" />
                  {format(new Date(task.scheduledFor), 'dd MMM, HH:mm')}
                  <span className="text-zinc-300">·</span>
                  Floor <span className="font-mono tabular-nums text-zinc-700">{task.room.floor}</span>
                </p>
                {task.notes && (
                  <p className="flex items-start gap-1.5 leading-relaxed">
                    <NoteIcon size={14} weight="regular" aria-hidden className="mt-0.5 shrink-0 text-zinc-400" />
                    <span className="line-clamp-2">{task.notes}</span>
                  </p>
                )}
              </div>

              <div className="mt-auto space-y-3 border-t border-zinc-100 pt-4">
                <label className="block">
                  <span className="sr-only">Assign room {task.room.roomNumber} task</span>
                  <select
                    className="input py-2 text-xs"
                    value={task.assignedTo?.id ?? ''}
                    disabled={assigningId === task.id}
                    onChange={(e) => assign(task, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.staff?.id ?? ''}>
                        {s.firstName} {s.lastName}
                        {s.staff?.department ? ` · ${s.staff.department}` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                {NEXT_STATUS[task.status] && (
                  <button type="button" className="btn-primary w-full" onClick={() => advance(task)}>
                    {NEXT_LABEL[task.status]}
                  </button>
                )}

                {task.status === HousekeepingStatus.COMPLETED && (
                  <p className="text-center text-xs text-zinc-500">Inspecting sets the room to available.</p>
                )}

                {task.status === HousekeepingStatus.INSPECTED && (
                  <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700">
                    <CheckCircleIcon size={14} weight="fill" aria-hidden />
                    Inspected · room is available
                  </p>
                )}
              </div>
            </Panel>
          ))}
        </motion.div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New housekeeping task"
        description="Schedule a clean for a room and optionally note what it needs."
        size="sm"
      >
        <ModalBody className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="hk-room" className="text-xs font-medium text-zinc-600">Room</label>
            <select id="hk-room" className="input" value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
              <option value="">Select room</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>#{r.roomNumber} · Floor {r.floor} ({humanize(r.status)})</option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="hk-type" className="text-xs font-medium text-zinc-600">Task type</label>
            <select id="hk-type" className="input" value={form.taskType} onChange={(e) => setForm({ ...form, taskType: e.target.value })}>
              <option value="checkout_cleaning">Checkout cleaning</option>
              <option value="daily_cleaning">Daily cleaning</option>
              <option value="deep_cleaning">Deep cleaning</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label htmlFor="hk-date" className="text-xs font-medium text-zinc-600">Scheduled for</label>
              <input id="hk-date" type="date" className="input" value={form.scheduledFor}
                onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <label htmlFor="hk-priority" className="text-xs font-medium text-zinc-600">Priority (1–5)</label>
              <input id="hk-priority" type="number" className="input" min={1} max={5} value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid gap-2">
            <label htmlFor="hk-notes" className="text-xs font-medium text-zinc-600">Notes</label>
            <textarea id="hk-notes" className="input" rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button type="button" className="btn-primary" disabled={!form.roomId} onClick={handleCreate}>Create task</button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
