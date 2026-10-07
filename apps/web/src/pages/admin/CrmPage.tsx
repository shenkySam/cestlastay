import { FormEvent, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  ArrowRightIcon,
  ArrowUUpLeftIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  HourglassIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  PaperPlaneTiltIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  PlusIcon,
  TicketIcon,
  TrashIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import api from '@/lib/api';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FilterPills,
  Modal,
  ModalBody,
  ModalFooter,
  Panel,
  PageHeader,
  Skeleton,
  SkeletonRows,
  StatTile,
  fadeItem,
  humanize,
  int,
  money,
  riseItem,
  stagger,
} from '@/components/admin/ui';

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

type Tab = 'emails' | 'discounts' | 'triggers';

const TABS: { value: Tab; label: string; icon: Icon }[] = [
  { value: 'emails', label: 'Email logs', icon: EnvelopeSimpleIcon },
  { value: 'discounts', label: 'Discount codes', icon: TicketIcon },
  { value: 'triggers', label: 'Triggers', icon: LightningIcon },
];

const STATUS_BADGE: Record<string, { cls: string; icon: Icon }> = {
  SENT: { cls: 'badge-green', icon: CheckCircleIcon },
  QUEUED: { cls: 'badge-yellow', icon: HourglassIcon },
  FAILED: { cls: 'badge-red', icon: WarningIcon },
  BOUNCED: { cls: 'badge-red', icon: ArrowUUpLeftIcon },
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

/** Rows past this index render without the waterfall so long lists don't trickle in. */
const STAGGER_CAP = 14;

const LABEL = 'text-sm font-medium text-zinc-700';
const TH = 'whitespace-nowrap px-4 py-3 text-left first:pl-6 last:pr-6 md:first:pl-8 md:last:pr-8';
const TD_FIRST = 'py-3.5 pl-6 pr-4 md:pl-8';
const TD = 'px-4 py-3.5';
const TD_LAST = 'py-3.5 pl-4 pr-6 md:pr-8';

export default function AdminCrmPage() {
  const [tab, setTab] = useState<Tab>('emails');

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
  const [pendingDelete, setPendingDelete] = useState<DiscountCode | null>(null);

  // Triggers
  const [triggers, setTriggers] = useState<Trigger[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // The three tabs share loading/error; only the latest request may settle them,
  // so a slow response from a tab you already left can't flag the current one.
  const requestId = useRef(0);

  useEffect(() => {
    if (tab === 'emails') loadEmails();
    if (tab === 'discounts') loadDiscounts();
    if (tab === 'triggers') loadTriggers();
  }, [tab, filterType, filterStatus]);

  async function loadEmails() {
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
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
      if (id !== requestId.current) return;
      setEmails(logsRes.data);
      setStats(statsRes.data);
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  async function loadDiscounts() {
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get('/crm/discount-codes');
      if (id !== requestId.current) return;
      setDiscounts(data);
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  async function loadTriggers() {
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get('/crm/triggers');
      if (id !== requestId.current) return;
      setTriggers(data);
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      if (id === requestId.current) setLoading(false);
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
    try {
      await api.delete(`/crm/discount-codes/${d.id}`);
      toast.success('Discount deleted');
      loadDiscounts();
    } catch {
      // handled
    }
  }

  function openCreate() {
    setForm(EMPTY_DISCOUNT);
    setShowModal(true);
  }

  function onSubmitDiscount(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    handleCreateDiscount();
  }

  const filtered = Boolean(filterType || filterStatus || search);

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Revenue"
        title="CRM & email"
        description="Email delivery logs, loyalty discount codes and the events that send automatic emails."
      />

      <FilterPills
        options={TABS}
        value={tab}
        onChange={setTab}
        layoutId="crm-tabs"
        aria-label="CRM sections"
      />

      <motion.div
        key={tab}
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {tab === 'emails' && (
          <>
            {(stats || loading) && (
              <motion.div
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr_1fr]"
                variants={stagger}
                initial="hidden"
                animate="show"
              >
                <StatTile
                  variants={riseItem}
                  emphasis
                  label="Total emails"
                  icon={PaperPlaneTiltIcon}
                  loading={!stats}
                  value={stats?.total ?? 0}
                  format={int}
                  hint={stats && stats.byType.length > 0 ? `Across ${stats.byType.length} email types` : undefined}
                />
                <StatTile
                  variants={riseItem}
                  label="Sent"
                  icon={CheckCircleIcon}
                  loading={!stats}
                  value={stats?.sent ?? 0}
                  format={int}
                />
                <StatTile
                  variants={riseItem}
                  label="Queued"
                  icon={HourglassIcon}
                  loading={!stats}
                  value={stats?.queued ?? 0}
                  format={int}
                />
                <StatTile
                  variants={riseItem}
                  label="Failed"
                  icon={WarningIcon}
                  loading={!stats}
                  value={stats?.failed ?? 0}
                  format={int}
                />
              </motion.div>
            )}

            <Panel flush eyebrow="Delivery" title="Email log">
              {/* Filters: the selects reload immediately; search runs on Enter or the button */}
              <div className="flex flex-wrap items-center gap-2 px-6 pb-5 md:px-8">
                <select
                  className="input w-full sm:w-52"
                  aria-label="Filter by email type"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">All types</option>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <select
                  className="input w-full sm:w-40"
                  aria-label="Filter by status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="SENT">Sent</option>
                  <option value="QUEUED">Queued</option>
                  <option value="FAILED">Failed</option>
                  <option value="BOUNCED">Bounced</option>
                </select>
                <div className="flex w-full gap-2 sm:w-auto sm:min-w-[18rem] sm:flex-1">
                  <div className="relative min-w-0 flex-1">
                    <MagnifyingGlassIcon
                      size={16}
                      weight="regular"
                      aria-hidden
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                      className="input pl-10"
                      aria-label="Search recipient or subject"
                      placeholder="Search recipient or subject…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadEmails()}
                    />
                  </div>
                  <button type="button" className="btn-secondary shrink-0" onClick={loadEmails}>
                    Search
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-6 pb-5 md:px-8">
                  <ErrorState title="Couldn't load the email log" onRetry={loadEmails} />
                </div>
              )}

              {loading ? (
                <SkeletonRows rows={6} avatar={false} className="border-t border-zinc-100 px-6 md:px-8" />
              ) : emails.length === 0 ? (
                !error && (
                  <EmptyState
                    icon={EnvelopeSimpleIcon}
                    className="border-t border-zinc-100"
                    title={filtered ? 'No emails match these filters' : 'No emails sent yet'}
                    description={
                      filtered
                        ? 'Clear the type, status or search to see the full log.'
                        : 'Automatic emails are logged here as soon as a trigger fires. The Triggers tab lists which events send mail.'
                    }
                  />
                )
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="border-y border-zinc-100">
                      <tr>
                        {['Type', 'Recipient', 'Subject', 'Status', 'Sent at'].map((h) => (
                          <th key={h} className={TH}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <motion.tbody
                      className="divide-y divide-zinc-100"
                      variants={stagger}
                      initial="hidden"
                      animate="show"
                    >
                      {emails.map((e, i) => {
                        const status = STATUS_BADGE[e.status];
                        const StatusIcon = status?.icon;
                        return (
                          <motion.tr key={e.id} variants={i < STAGGER_CAP ? fadeItem : undefined}>
                            <td className={`${TD_FIRST} whitespace-nowrap`}>
                              <span className="badge badge-gray">{TYPE_LABEL[e.type] ?? humanize(e.type)}</span>
                            </td>
                            <td className={TD}>
                              <p className="font-medium text-zinc-900">
                                {e.recipientName ?? <span className="text-zinc-300">—</span>}
                              </p>
                              <p className="text-xs text-zinc-500">{e.recipientEmail}</p>
                            </td>
                            <td className={`${TD} text-zinc-700`}>{e.subject}</td>
                            <td className={TD}>
                              <span className={`badge ${status?.cls ?? 'badge-gray'}`}>
                                {StatusIcon && <StatusIcon size={12} weight="regular" />}
                                {humanize(e.status)}
                              </span>
                              {e.errorMessage && (
                                <p className="mt-1 max-w-xs truncate text-xs text-rose-600" title={e.errorMessage}>
                                  {e.errorMessage}
                                </p>
                              )}
                            </td>
                            <td className={`${TD_LAST} whitespace-nowrap`}>
                              {e.sentAt ? (
                                <span className="font-mono text-xs tabular-nums text-zinc-500">
                                  {format(new Date(e.sentAt), 'dd MMM HH:mm')}
                                </span>
                              ) : (
                                <span className="text-zinc-300">—</span>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </motion.tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        )}

        {tab === 'discounts' && (
          <Panel
            flush
            eyebrow="Loyalty"
            title={
              <span className="flex items-baseline gap-2">
                Discount codes
                {!loading && (
                  <span className="font-mono text-sm font-normal tabular-nums text-zinc-400">{discounts.length}</span>
                )}
              </span>
            }
            action={
              <button type="button" className="btn-primary" onClick={openCreate}>
                <PlusIcon size={16} weight="regular" />
                New code
              </button>
            }
          >
            {error && (
              <div className="px-6 pb-5 md:px-8">
                <ErrorState title="Couldn't load discount codes" onRetry={loadDiscounts} />
              </div>
            )}

            {loading ? (
              <SkeletonRows rows={5} avatar={false} className="mt-1 border-t border-zinc-100 px-6 md:px-8" />
            ) : discounts.length === 0 ? (
              !error && (
                <EmptyState
                  icon={TicketIcon}
                  className="mt-1 border-t border-zinc-100"
                  title="No discount codes yet"
                  description="Create a code for a promotion or a returning guest. Leave the code blank and one is generated for you."
                  action={
                    <button type="button" className="btn-secondary" onClick={openCreate}>
                      <PlusIcon size={16} weight="regular" />
                      New code
                    </button>
                  }
                />
              )
            ) : (
              <div className="relative mt-1 overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="border-y border-zinc-100">
                    <tr>
                      {['Code', 'Description', 'Value', 'Validity', 'Usage', 'Status'].map((h) => (
                        <th key={h} className={TH}>{h}</th>
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
                    {discounts.map((d, i) => {
                      const expired = new Date(d.validUntil) < new Date();
                      const usage = d.maxUses ? Math.min(1, d.usedCount / d.maxUses) : null;
                      return (
                        <motion.tr key={d.id} variants={i < STAGGER_CAP ? fadeItem : undefined}>
                          <td className={`${TD_FIRST} whitespace-nowrap font-mono font-semibold text-lagoon-700`}>
                            {d.code}
                          </td>
                          <td className={`${TD} text-zinc-700`}>{d.description}</td>
                          <td className={`${TD} whitespace-nowrap font-mono tabular-nums text-zinc-900`}>
                            {d.discountType === 'PERCENTAGE'
                              ? `${Number(d.discountValue)}%`
                              : money(Number(d.discountValue), { cents: true })}
                          </td>
                          <td className={`${TD} whitespace-nowrap`}>
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-zinc-500">
                              {format(new Date(d.validFrom), 'dd MMM yyyy')}
                              <ArrowRightIcon size={12} weight="regular" aria-hidden className="text-zinc-400" />
                              <span className="sr-only">to</span>
                              {format(new Date(d.validUntil), 'dd MMM yyyy')}
                            </span>
                            {expired && <span className="badge badge-gray ml-2">Expired</span>}
                          </td>
                          <td className={`${TD} whitespace-nowrap`}>
                            <span className="font-mono text-sm tabular-nums text-zinc-900">
                              {d.usedCount}
                              {d.maxUses ? <span className="text-zinc-400"> / {d.maxUses}</span> : null}
                            </span>
                            {usage !== null && (
                              <span aria-hidden className="mt-1.5 block h-1 w-16 overflow-hidden rounded-full bg-zinc-100">
                                <span
                                  className="block h-full rounded-full bg-lagoon-500"
                                  style={{ width: `${usage * 100}%` }}
                                />
                              </span>
                            )}
                          </td>
                          <td className={TD}>
                            <span className={`badge ${d.isActive ? 'badge-green' : 'badge-gray'}`}>
                              {d.isActive && <CheckCircleIcon size={12} weight="regular" />}
                              {d.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className={TD_LAST}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                className="btn-ghost whitespace-nowrap"
                                onClick={() => toggleDiscount(d)}
                              >
                                {d.isActive ? (
                                  <PauseCircleIcon size={16} weight="regular" />
                                ) : (
                                  <PlayCircleIcon size={16} weight="regular" />
                                )}
                                {d.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                type="button"
                                className="btn-icon hover:bg-rose-50 hover:text-rose-600"
                                aria-label={`Delete ${d.code}`}
                                title="Delete"
                                onClick={() => setPendingDelete(d)}
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
        )}

        {tab === 'triggers' && (
          <Panel flush eyebrow="Automation" title="Email triggers">
            <p className="max-w-[65ch] px-6 pb-5 text-sm leading-relaxed text-zinc-500 md:px-8">
              Automatic email triggers run by the system. Cron jobs run daily on the API server.
            </p>

            {error && (
              <div className="px-6 pb-5 md:px-8">
                <ErrorState title="Couldn't load triggers" onRetry={loadTriggers} />
              </div>
            )}

            {loading ? (
              <div role="status" aria-label="Loading" className="divide-y divide-zinc-100 border-t border-zinc-100">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 md:px-8">
                    <Skeleton className="size-10 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-3 w-40 rounded-full" />
                      <Skeleton className="h-2.5 w-64 max-w-full rounded-full" />
                    </div>
                    <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                  </div>
                ))}
              </div>
            ) : triggers.length === 0 ? (
              !error && (
                <EmptyState
                  icon={LightningIcon}
                  className="border-t border-zinc-100"
                  title="No triggers registered"
                  description="Triggers are defined on the API server. Once an event is wired to an email, it's listed here with the emails it sends."
                />
              )
            ) : (
              <motion.ul
                className="divide-y divide-zinc-100 border-t border-zinc-100"
                variants={stagger}
                initial="hidden"
                animate="show"
              >
                {triggers.map((t) => (
                  <motion.li
                    key={t.event}
                    variants={riseItem}
                    className="flex items-center gap-4 px-6 py-4 md:px-8"
                  >
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${
                        t.emails.length
                          ? 'bg-lagoon-50 text-lagoon-700 ring-lagoon-600/15'
                          : 'bg-zinc-50 text-zinc-400 ring-zinc-200/70'
                      }`}
                    >
                      <LightningIcon size={18} weight="regular" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-medium text-zinc-900">{t.event}</p>
                      {t.emails.length === 0 ? (
                        <p className="mt-1 text-xs text-zinc-500">No emails (in-app notifications only)</p>
                      ) : (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {t.emails.map((email) => (
                            <span
                              key={email}
                              className="rounded-md bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600 ring-1 ring-inset ring-zinc-200/70"
                            >
                              {email}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`badge shrink-0 ${t.emails.length ? 'badge-green' : 'badge-gray'}`}>
                      {t.emails.length ? (
                        <>
                          <EnvelopeSimpleIcon size={12} weight="regular" />
                          <span className="font-mono tabular-nums">{t.emails.length}</span>
                          {t.emails.length === 1 ? 'email' : 'emails'}
                        </>
                      ) : (
                        'No email'
                      )}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </Panel>
        )}
      </motion.div>

      {/* New discount code */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New discount code">
        <form onSubmit={onSubmitDiscount} className="flex min-h-0 flex-1 flex-col">
          <ModalBody>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="discount-code" className={LABEL}>Code</label>
                <input
                  id="discount-code"
                  className="input font-mono uppercase"
                  placeholder="PROMO-XYZ"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
                <p className="text-xs text-zinc-500">Leave blank to auto-generate.</p>
              </div>

              <div className="grid gap-2">
                <label htmlFor="discount-description" className={LABEL}>Description</label>
                <input
                  id="discount-description"
                  className="input"
                  placeholder="e.g. Summer 2026 promotion"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="discount-type" className={LABEL}>Type</label>
                  <select
                    id="discount-type"
                    className="input"
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="discount-value" className={LABEL}>
                    Value {form.discountType === 'PERCENTAGE' ? '(%)' : '($)'}
                  </label>
                  <input
                    id="discount-value"
                    className="input font-mono tabular-nums"
                    type="number"
                    min={0}
                    step="any"
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label htmlFor="discount-valid-until" className={LABEL}>Valid until</label>
                <input
                  id="discount-valid-until"
                  className="input font-mono tabular-nums"
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="discount-max-uses" className={LABEL}>
                    Max uses <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <input
                    id="discount-max-uses"
                    className="input font-mono tabular-nums"
                    type="number"
                    min={1}
                    value={form.maxUses}
                    onChange={(e) => setForm({ ...form, maxUses: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="discount-min-stays" className={LABEL}>
                    Min stays <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <input
                    id="discount-min-stays"
                    className="input font-mono tabular-nums"
                    type="number"
                    min={1}
                    value={form.minStays}
                    onChange={(e) => setForm({ ...form, minStays: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create code'}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete discount code"
        description={
          pendingDelete ? (
            <>
              Delete <span className="font-mono font-medium text-zinc-900">{pendingDelete.code}</span>? This cannot be
              undone.
            </>
          ) : undefined
        }
        confirmLabel="Delete code"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await deleteDiscount(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
