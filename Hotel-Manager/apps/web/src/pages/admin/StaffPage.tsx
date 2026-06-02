import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { IUser, UserRole, UserStatus } from '@shared/index';

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'badge-red',
  STAFF: 'badge-blue',
  GUEST: 'badge-gray',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'badge-green',
  INACTIVE: 'badge-yellow',
  SUSPENDED: 'badge-red',
};

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  role: UserRole.STAFF as UserRole,
  department: '',
  position: '',
};

export default function AdminStaffPage() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [filterRole]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/users', {
        params: filterRole ? { role: filterRole } : {},
      });
      // exclude guests from staff management view
      setUsers(data.filter((u: IUser) => u.role !== UserRole.GUEST));
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
    if (!confirm(`Delete ${user.firstName} ${user.lastName}? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      toast.success('User deleted');
      load();
    } catch {
      // errors shown by interceptor
    }
  }

  const staffOnly = users.filter((u) => !filterRole || u.role === filterRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Staff Management</h2>
          <p className="text-gray-500 text-sm mt-1">{staffOnly.length} team members</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }}>
          + Add Staff
        </button>
      </div>

      {/* Role filter */}
      <div className="flex gap-2">
        {['', UserRole.ADMIN, UserRole.STAFF].map((r) => (
          <button
            key={r}
            onClick={() => setFilterRole(r)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
              filterRole === r
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {r || 'All Roles'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Email', 'Phone', 'Role', 'Employee ID', 'Department', 'Status', 'Last Login', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffOnly.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${ROLE_BADGE[u.role] ?? 'badge-gray'}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {(u as any).staff?.employeeId || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {(u as any).staff?.department || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_BADGE[u.status] ?? 'badge-gray'}`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {u.lastLoginAt ? format(new Date(u.lastLoginAt), 'dd MMM HH:mm') : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
                        onClick={() => toggleStatus(u)}
                      >
                        {u.status === UserStatus.ACTIVE ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                        onClick={() => handleDelete(u)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staffOnly.length === 0 && (
            <div className="text-center py-12 text-gray-400">No staff found.</div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold">Add Team Member</h3>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'firstName', label: 'First Name' },
                { key: 'lastName', label: 'Last Name' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    className="input"
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                className="input"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole, department: '', position: '' })}
              >
                <option value={UserRole.STAFF}>Staff</option>
                <option value={UserRole.ADMIN}>Admin</option>
              </select>
            </div>

            {form.role === UserRole.STAFF && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    className="input"
                    placeholder="e.g. Front Desk"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    className="input"
                    placeholder="e.g. Receptionist"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                className="btn-primary flex-1"
                disabled={saving || !form.firstName || !form.email || form.password.length < 8}
                onClick={handleCreate}
              >
                {saving ? 'Creating...' : 'Create Account'}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
