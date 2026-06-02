import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface EmailLog {
  id: string;
  recipientEmail: string;
  recipientName?: string | null;
  type: string;
  status: string;
  subject: string;
  sentAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  queued: number;
  byType: Array<{ type: string; _count: { _all: number } }>;
}

interface DiscountCode {
  id: string;
  code: string;
  description: string;
  discountType: string;
  discountValue: number | string;
  validFrom: string;
  validUntil: string;
  maxUses?: number | null;
  usedCount: number;
  isActive: boolean;
  minStays?: number | null;
}

interface Trigger {
  event: string;
  emails: string[];
}

const STATUS_BADGE: Record<string, string> = {
  SENT: 'badge-green',
  QUEUED: 'badge-yellow',
  FAILED: 'badge-red',
  BOUNCED: 'badge-red',
};

const TYPE_LABEL: Record<string, string> = {
  WELCOME: 'Welcome',
  BOOKING_CONFIRMATION: 'Booking Confirmation',
  CHECK_IN_REMINDER: 'Check-in Reminder',
  CHECK_OUT_THANK_YOU: 'Check-out Thanks',
  LOYALTY_DISCOUNT: 'Loyalty Discount',
  PROMOTIONAL: 'Promotional',
  PASSWORD_RESET: 'Password Reset',
};

const EMPTY_DISCOUNT = {
  code: '',
  description: '',
  discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
  discountValue: 10,
  validUntil: '',
  maxUses: '' as string | number,
  minStays: '' as string | number,
};

export default function AdminCrmPage() {
  const [tab, setTab] = useState<'emails' | 'discounts' | 'triggers'>('emails');

  // Emails
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  // Discounts
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_DISCOUNT);
  const [saving, setSaving] = useState(false);

  // Triggers
  const [triggers, setTriggers] = useState<Trigger[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tab === 'emails') loadEmails();
    if (tab === 'discounts') loadDiscounts();
    if (tab === 'triggers') loadTriggers();
  }, [tab, filterType, filterStatus]);

  async function loadEmails() {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        api.get('/crm/emails', {
          params: {
            ...(filterType && { type: filterType }),
            ...(filterStatus && { status: filterStatus }),
            ...(search && { search }),
          },
        }),
        api.get('/crm/emails/stats'),
      ]);
      setEmails(logsRes.data);
      setStats(statsRes.data);
    } finally {
      setLoading(false);
    }
  }

  async function loadDiscounts() {
    setLoading(true);
    try {
      const { data } = await api.get('/crm/discount-codes');
      setDiscounts(data);
    } finally {
      setLoading(false);
    }
  }

  async function loadTriggers() {
    setLoading(true);
    try {
      const { data } = await api.get('/crm/triggers');
      setTriggers(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDiscount() {
    if (!form.description || !form.validUntil || form.discountValue <= 0) {
      toast.error('Description, value and valid-until are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/crm/discount-codes', {
        ...(form.code ? { code: form.code.trim().toUpperCase() } : {}),
        description: form.description,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        validUntil: new Date(form.validUntil).toISOString(),
        ...(form.maxUses !== '' && { maxUses: Number(form.maxUses) }),
        ...(form.minStays !== '' && { minStays: Number(form.minStays) }),
      });
      toast.success('Discount code created');
      setShowModal(false);
      setForm(EMPTY_DISCOUNT);
      loadDiscounts();
    } finally {
      setSaving(false);
    }
  }

  async function toggleDiscount(d: DiscountCode) {
    try {
      await api.patch(`/crm/discount-codes/${d.id}/toggle`, { isActive: !d.isActive });
      toast.success(`Discount ${!d.isActive ? 'activated' : 'deactivated'}`);
      loadDiscounts();
    } catch {
      // handled
    }
  }

  async function deleteDiscount(d: DiscountCode) {
    if (!confirm(`Delete discount ${d.code}? This cannot be undone.`)) return;
    try {
      await api.delete(`/crm/discount-codes/${d.id}`);
      toast.success('Discount deleted');
      loadDiscounts();
    } catch {
      // handled
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">CRM & Email Automation</h2>
        <p className="text-gray-500 text-sm mt-1">Email logs, loyalty discounts and trigger overview.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'emails' as const, label: 'Email Logs' },
          { key: 'discounts' as const, label: 'Discount Codes' },
          { key: 'triggers' as const, label: 'Triggers' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'emails' && (
        <div className="space-y-4">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total', value: stats.total, icon: '📬' },
                { label: 'Sent', value: stats.sent, icon: '✅' },
                { label: 'Queued', value: stats.queued, icon: '⏳' },
                { label: 'Failed', value: stats.failed, icon: '⚠️' },
              ].map((s) => (
                <div key={s.label} className="card p-5">
                  <span className="text-2xl">{s.icon}</span>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{s.value}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="input max-w-[200px]"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All types</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              className="input max-w-[160px]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="SENT">Sent</option>
              <option value="QUEUED">Queued</option>
              <option value="FAILED">Failed</option>
              <option value="BOUNCED">Bounced</option>
            </select>
            <input
              className="input max-w-[260px]"
              placeholder="Search recipient or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadEmails()}
            />
            <button className="btn-secondary" onClick={loadEmails}>Search</button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Type', 'Recipient', 'Subject', 'Status', 'Sent At'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {emails.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="badge badge-blue">{TYPE_LABEL[e.type] ?? e.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{e.recipientName ?? '—'}</div>
                        <div className="text-gray-500 text-xs">{e.recipientEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{e.subject}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${STATUS_BADGE[e.status] ?? 'badge-gray'}`}>{e.status}</span>
                        {e.errorMessage && (
                          <div className="text-xs text-red-500 mt-0.5 max-w-xs truncate" title={e.errorMessage}>
                            {e.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {e.sentAt ? format(new Date(e.sentAt), 'dd MMM HH:mm') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {emails.length === 0 && (
                <div className="text-center py-12 text-gray-400">No emails yet.</div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'discounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{discounts.length} discount code(s).</p>
            <button className="btn-primary" onClick={() => { setForm(EMPTY_DISCOUNT); setShowModal(true); }}>
              + New Code
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Code', 'Description', 'Value', 'Validity', 'Usage', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {discounts.map((d) => {
                    const expired = new Date(d.validUntil) < new Date();
                    return (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-blue-700 font-semibold whitespace-nowrap">{d.code}</td>
                        <td className="px-4 py-3 text-gray-700">{d.description}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {d.discountType === 'PERCENTAGE' ? `${Number(d.discountValue)}%` : `$${Number(d.discountValue).toFixed(2)}`}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {format(new Date(d.validFrom), 'dd MMM yyyy')} → {format(new Date(d.validUntil), 'dd MMM yyyy')}
                          {expired && <span className="ml-2 badge badge-gray">Expired</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {d.usedCount}{d.maxUses ? ` / ${d.maxUses}` : ''}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${d.isActive ? 'badge-green' : 'badge-gray'}`}>
                            {d.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                              onClick={() => toggleDiscount(d)}
                            >
                              {d.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => deleteDiscount(d)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {discounts.length === 0 && (
                <div className="text-center py-12 text-gray-400">No discount codes yet.</div>
              )}
            </div>
          )}

          {showModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
                <h3 className="text-lg font-semibold">New Discount Code</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code <span className="text-gray-400 font-normal">(leave blank to auto-generate)</span>
                  </label>
                  <input
                    className="input font-mono uppercase"
                    placeholder="PROMO-XYZ"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    className="input"
                    placeholder="e.g. Summer 2026 promotion"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      className="input"
                      value={form.discountType}
                      onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}
                    >
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="FIXED">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Value {form.discountType === 'PERCENTAGE' ? '(%)' : '($)'}
                    </label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={form.discountValue}
                      onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input
                    className="input"
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses (optional)</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={form.maxUses}
                      onChange={(e) => setForm({ ...form, maxUses: e.target.value === '' ? '' : Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Stays (optional)</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={form.minStays}
                      onChange={(e) => setForm({ ...form, minStays: e.target.value === '' ? '' : Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button className="btn-primary flex-1" disabled={saving} onClick={handleCreateDiscount}>
                    {saving ? 'Creating...' : 'Create Code'}
                  </button>
                  <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'triggers' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Automatic email triggers run by the system. Cron jobs run daily on the API server.
          </p>
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : (
            <div className="grid gap-3">
              {triggers.map((t) => (
                <div key={t.event} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-gray-900">{t.event}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t.emails.length === 0 ? 'No emails (in-app notifications only)' : t.emails.join(', ')}
                    </p>
                  </div>
                  <span className={`badge ${t.emails.length ? 'badge-green' : 'badge-gray'}`}>
                    {t.emails.length ? `${t.emails.length} email(s)` : 'no email'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
