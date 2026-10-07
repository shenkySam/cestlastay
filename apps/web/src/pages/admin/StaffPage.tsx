import { FormEvent, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  IdentificationBadgeIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import clsx from 'clsx';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { IUser, UserRole, UserStatus } from '@shared/index';
import {
  Avatar,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FilterPills,
  Modal,
  ModalBody,
  ModalFooter,
  Panel,
  PageHeader,
  SkeletonRows,
  StatusDot,
  fadeItem,
  humanize,
  snappy,
  stagger,
} from '@/components/admin/ui';
import type { Tone } from '@/components/admin/ui';

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'badge-purple',
  STAFF: 'badge-blue',
  GUEST: 'badge-gray',
};

const STATUS_TONE: Record<string, { tone: Tone; pulse: boolean }> = {
  ACTIVE: { tone: 'emerald', pulse: true },
  INACTIVE: { tone: 'zinc', pulse: false },
  SUSPENDED: { tone: 'rose', pulse: false },
};

const ROLE_FILTERS = [
  { value: '', label: 'All roles', icon: UsersThreeIcon },
  { value: UserRole.ADMIN as string, label: 'Admins', icon: ShieldCheckIcon },
  { value: UserRole.STAFF as string, label: 'Staff', icon: IdentificationBadgeIcon },
];

const COLUMNS = ['Member', 'Phone', 'Role', 'Employee ID', 'Department', 'Status', 'Last login'];

/** Rows past this index render without the waterfall so long lists don't trickle in. */
const STAGGER_CAP = 14;

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: UserRole.STAFF as UserRole,
  department: '',
  position: '',
};

export default function AdminStaffPage() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<IUser | null>(null);

  useEffect(() => { load(); }, [filterRole]);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get('/users', {
        params: filterRole ? { role: filterRole } : {},
      });
      // exclude guests from staff management view
      setUsers(data.filter((u: IUser) => u.role !== UserRole.GUEST));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setSaving(true);
    try {
      await api.post('/users', form);
      toast.success(`${form.firstName} added as ${form.role}`);
      setShowModal(false);
      setForm(EMPTY_FORM);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: IUser) {
    const next = user.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
    try {
      await api.patch(`/users/${user.id}/status`, { status: next });
      toast.success(`${user.firstName} set to ${next}`);
      load();
    } catch {
      // errors shown by interceptor
    }
  }

  async function handleDelete(user: IUser) {
    try {
      await api.delete(`/users/${user.id}`);
      toast.success('User deleted');
      load();
    } catch {
      // errors shown by interceptor
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving || !form.firstName || !form.email) return;
    handleCreate();
  }

  const staffOnly = users.filter((u) => !filterRole || u.role === filterRole);
  const firstLoad = loading && users.length === 0;
  const filterLabel = ROLE_FILTERS.find((r) => r.value === filterRole)?.label ?? 'All roles';

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Team"
        title="Staff"
        description="Add staff and admins, switch their access on or off, and see when they last signed in."
        actions={
          <button type="button" className="btn-primary" onClick={openCreate}>
            <PlusIcon size={16} weight="regular" />
            Add staff member
          </button>
        }
      />

      <Panel flush>
        <div className="flex flex-col gap-4 px-6 pb-5 pt-6 md:flex-row md:items-center md:justify-between md:px-8 md:pt-7">
          <div className="min-w-0">
            <p className="eyebrow">Directory</p>
            <h2 className="mt-1.5 flex items-baseline gap-2 text-base font-semibold tracking-tight text-zinc-900">
              Team members
              {!firstLoad && (
                <span className="font-mono text-sm font-normal tabular-nums text-zinc-400">
                  {staffOnly.length}
                </span>
              )}
            </h2>
          </div>
          <FilterPills
            options={ROLE_FILTERS}
            value={filterRole}
            onChange={setFilterRole}
            layoutId="staff-role"
            aria-label="Filter by role"
          />
        </div>

        {error && (
          <div className="px-6 pb-5 md:px-8">
            <ErrorState title="Couldn't load the team" onRetry={load} />
          </div>
        )}

        {firstLoad ? (
          <SkeletonRows rows={6} className="border-t border-zinc-100 px-6 md:px-8" />
        ) : staffOnly.length === 0 ? (
          !error && (
            <EmptyState
              icon={UsersThreeIcon}
              className="border-t border-zinc-100"
              title={filterRole ? `No ${filterLabel.toLowerCase()} yet` : 'No team members yet'}
              description={
                filterRole
                  ? 'Switch to All roles, or add someone with this role.'
                  : 'Add a staff member or admin. They sign in with the Google or Apple account that uses the email you enter.'
              }
              action={
                <button type="button" className="btn-secondary" onClick={openCreate}>
                  <PlusIcon size={16} weight="regular" />
                  Add staff member
                </button>
              }
            />
          )
        ) : (
          <div
            aria-busy={loading}
            className={clsx('relative overflow-x-auto transition-opacity duration-300', loading && 'opacity-60')}
          >
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-y border-zinc-100">
                <tr>
                  {COLUMNS.map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left first:pl-6 md:first:pl-8">
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3 pr-6 text-right md:pr-8">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <motion.tbody
                className="divide-y divide-zinc-100"
                variants={stagger}
                initial="hidden"
                animate="show"
              >
                {staffOnly.map((u, i) => {
                  const staff = (u as any).staff;
                  const status = STATUS_TONE[u.status] ?? { tone: 'zinc' as Tone, pulse: false };
                  const isActive = u.status === UserStatus.ACTIVE;
                  const name = `${u.firstName} ${u.lastName}`;
                  return (
                    <motion.tr key={u.id} variants={i < STAGGER_CAP ? fadeItem : undefined}>
                      <td className="py-3.5 pl-6 pr-4 md:pl-8">
                        <div className="flex items-center gap-3">
                          <Avatar firstName={u.firstName} lastName={u.lastName} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-900">{name}</p>
                            <p className="truncate text-xs text-zinc-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs tabular-nums text-zinc-600">
                        {u.phone || <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`badge ${ROLE_BADGE[u.role] ?? 'badge-gray'}`}>{humanize(u.role)}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs tabular-nums text-zinc-600">
                        {staff?.employeeId || <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-600">
                        {staff?.department || <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-2 text-zinc-700">
                          <StatusDot tone={status.tone} pulse={status.pulse} />
                          {humanize(u.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {u.lastLoginAt ? (
                          <span className="font-mono text-xs tabular-nums text-zinc-500">
                            {format(new Date(u.lastLoginAt), 'dd MMM HH:mm')}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">Never</span>
                        )}
                      </td>
                      <td className="py-3.5 pl-4 pr-6 md:pr-8">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="btn-icon"
                            aria-label={`${isActive ? 'Deactivate' : 'Activate'} ${name}`}
                            title={isActive ? 'Deactivate' : 'Activate'}
                            onClick={() => toggleStatus(u)}
                          >
                            {isActive ? (
                              <PauseCircleIcon size={18} weight="regular" />
                            ) : (
                              <PlayCircleIcon size={18} weight="regular" />
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn-icon hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Delete ${name}`}
                            title="Delete"
                            onClick={() => setPendingDelete(u)}
                          >
                            <TrashIcon size={18} weight="regular" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Add staff modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add team member"
        description="Create an account for a new staff member or admin."
      >
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <ModalBody>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="staff-first-name" className="text-sm font-medium text-zinc-700">First name</label>
                  <input
                    id="staff-first-name"
                    className="input"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="staff-last-name" className="text-sm font-medium text-zinc-700">Last name</label>
                  <input
                    id="staff-last-name"
                    className="input"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label htmlFor="staff-email" className="text-sm font-medium text-zinc-700">Email</label>
                <input
                  id="staff-email"
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <p className="text-xs text-zinc-500">
                  They'll sign in with the Google or Apple account that uses this email.
                </p>
              </div>

              <div className="grid gap-2">
                <label htmlFor="staff-phone" className="text-sm font-medium text-zinc-700">Phone</label>
                <input
                  id="staff-phone"
                  className="input font-mono tabular-nums"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="staff-role" className="text-sm font-medium text-zinc-700">Role</label>
                <select
                  id="staff-role"
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole, department: '', position: '' })}
                >
                  <option value={UserRole.STAFF}>Staff</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                </select>
              </div>

              {form.role === UserRole.STAFF && (
                <motion.div
                  className="grid gap-4 sm:grid-cols-2"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={snappy}
                >
                  <div className="grid gap-2">
                    <label htmlFor="staff-department" className="text-sm font-medium text-zinc-700">Department</label>
                    <input
                      id="staff-department"
                      className="input"
                      placeholder="e.g. Front Desk"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="staff-position" className="text-sm font-medium text-zinc-700">Position</label>
                    <input
                      id="staff-position"
                      className="input"
                      placeholder="e.g. Receptionist"
                      value={form.position}
                      onChange={(e) => setForm({ ...form, position: e.target.value })}
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving || !form.firstName || !form.email}>
              {saving ? 'Creating…' : 'Create account'}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete team member"
        description={
          pendingDelete
            ? `Delete ${pendingDelete.firstName} ${pendingDelete.lastName}? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete member"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await handleDelete(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
