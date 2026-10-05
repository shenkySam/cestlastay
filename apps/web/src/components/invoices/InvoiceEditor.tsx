import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { IBooking, BookingSource, PaymentMethod } from '@shared/index';
import { roomNumbersLabel } from '@/lib/rooms';

interface InvoiceItem {
  id: string;
  serviceRequestId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface PaymentRow {
  id: string;
  paymentNumber: string;
  amount: number;
  method: string;
  status: string;
  notes?: string | null;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  issuedAt: string;
  dueDate: string;
  paidAt?: string | null;
  items: InvoiceItem[];
  payments: PaymentRow[];
}

interface BillableService {
  id: string;
  ticketNumber: string;
  type: string;
  description: string;
  estimatedCost?: number | null;
  actualCost?: number | null;
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-gray',
  PENDING: 'badge-yellow',
  PAID: 'badge-green',
  PARTIALLY_PAID: 'badge-blue',
  OVERDUE: 'badge-red',
  CANCELLED: 'badge-gray',
};

const OTA_SOURCES: BookingSource[] = [
  BookingSource.BOOKING_COM,
  BookingSource.AIRBNB,
  BookingSource.EXPEDIA,
  BookingSource.AGODA,
  BookingSource.OTHER_OTA,
];

const fmt = (n: number | string) => `$${Number(n).toFixed(2)}`;
const humanize = (s: string) =>
  s.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export default function InvoiceEditor({ booking, onClose }: { booking: IBooking; onClose: () => void }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create panel
  const isOta = OTA_SOURCES.includes(booking.source);
  const [includeRoomCharge, setIncludeRoomCharge] = useState(!isOta);

  // Add-item form
  const [newDesc, setNewDesc] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newPrice, setNewPrice] = useState('');

  // Inline item editing
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editQty, setEditQty] = useState('1');
  const [editPrice, setEditPrice] = useState('');

  // Service request picker
  const [showPicker, setShowPicker] = useState(false);
  const [billable, setBillable] = useState<BillableService[]>([]);

  // Adjustments
  const [discountDraft, setDiscountDraft] = useState('');
  const [dueDateDraft, setDueDateDraft] = useState('');

  // Payment form
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [payNotes, setPayNotes] = useState('');

  const nights = Math.max(
    1,
    Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000),
  );
  const nightsLabel = `${nights} night${nights !== 1 ? 's' : ''}`;
  // One room-charge line per room on the booking (matches the API's createFolio descriptions)
  const roomCharges = (booking.rooms ?? []).map((br) => ({
    description: `${br.room?.category?.name ?? 'Room'} (Room ${br.room?.roomNumber}) — ${nightsLabel}`,
    unitPrice: Number(br.roomRate),
  }));
  const roomChargeTotal = roomCharges.reduce((sum, rc) => sum + rc.unitPrice * nights, 0);
  const missingRoomCharges = roomCharges.filter(
    (rc) => !invoice?.items.some((i) => i.description === rc.description),
  );

  useEffect(() => {
    load();
  }, [booking.id]);

  function applyInvoice(inv: Invoice) {
    setInvoice(inv);
    setDiscountDraft(String(Number(inv.discountAmount)));
    setDueDateDraft(inv.dueDate ? format(new Date(inv.dueDate), 'yyyy-MM-dd') : '');
  }

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/invoices/booking/${booking.id}`).catch(() => ({ data: null }));
      if (data) {
        applyInvoice(data);
        loadBillable();
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadBillable() {
    const { data } = await api
      .get(`/invoices/booking/${booking.id}/billable-services`)
      .catch(() => ({ data: [] }));
    setBillable(data);
  }

  async function run(fn: () => Promise<void>) {
    setSaving(true);
    try {
      await fn();
    } catch {
      // errors shown by interceptor
    } finally {
      setSaving(false);
    }
  }

  const createFolio = () =>
    run(async () => {
      const { data } = await api.post(`/invoices/booking/${booking.id}`, { includeRoomCharge });
      applyInvoice(data);
      loadBillable();
      toast.success('Draft folio created');
    });

  const addManualItem = () =>
    run(async () => {
      const { data } = await api.post(`/invoices/${invoice!.id}/items`, {
        description: newDesc.trim(),
        quantity: Math.max(1, parseInt(newQty, 10) || 1),
        unitPrice: parseFloat(newPrice) || 0,
      });
      applyInvoice(data);
      setNewDesc('');
      setNewQty('1');
      setNewPrice('');
    });

  const addRoomCharge = (rc: { description: string; unitPrice: number }) =>
    run(async () => {
      const { data } = await api.post(`/invoices/${invoice!.id}/items`, {
        description: rc.description,
        quantity: nights,
        unitPrice: rc.unitPrice,
      });
      applyInvoice(data);
    });

  const addServiceItem = (serviceRequestId: string) =>
    run(async () => {
      const { data } = await api.post(`/invoices/${invoice!.id}/items`, { serviceRequestId });
      applyInvoice(data);
      loadBillable();
    });

  function startEdit(item: InvoiceItem) {
    setEditItemId(item.id);
    setEditDesc(item.description);
    setEditQty(String(item.quantity));
    setEditPrice(String(Number(item.unitPrice)));
  }

  const saveEdit = () =>
    run(async () => {
      const { data } = await api.patch(`/invoices/${invoice!.id}/items/${editItemId}`, {
        description: editDesc.trim(),
        quantity: Math.max(1, parseInt(editQty, 10) || 1),
        unitPrice: parseFloat(editPrice) || 0,
      });
      applyInvoice(data);
      setEditItemId(null);
    });

  const removeItem = (itemId: string) =>
    run(async () => {
      const { data } = await api.delete(`/invoices/${invoice!.id}/items/${itemId}`);
      applyInvoice(data);
      loadBillable();
    });

  const saveAdjustments = () =>
    run(async () => {
      const { data } = await api.patch(`/invoices/${invoice!.id}`, {
        discountAmount: parseFloat(discountDraft) || 0,
        ...(dueDateDraft && { dueDate: dueDateDraft }),
      });
      applyInvoice(data);
      toast.success('Invoice updated');
    });

  const issueInvoice = () =>
    run(async () => {
      const { data } = await api.post(`/invoices/${invoice!.id}/issue`);
      applyInvoice(data);
      toast.success('Invoice issued — now visible to the guest');
    });

  const recordPayment = () =>
    run(async () => {
      await api.post('/payments/manual', {
        invoiceId: invoice!.id,
        amount: parseFloat(payAmount),
        method: payMethod,
        ...(payNotes.trim() && { notes: payNotes.trim() }),
      });
      toast.success('Payment recorded');
      setShowPayForm(false);
      setPayAmount('');
      setPayNotes('');
      const { data } = await api.get(`/invoices/booking/${booking.id}`);
      applyInvoice(data);
    });

  const isDraft = invoice?.status === 'DRAFT';
  const isCancelled = invoice?.status === 'CANCELLED';
  const canEdit = !!invoice && !isCancelled;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">Invoice / Folio</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {booking.bookingNumber} · {booking.guest?.firstName} {booking.guest?.lastName} · Room{' '}
              {roomNumbersLabel(booking, 4)} · {humanize(booking.source)}
            </p>
          </div>
          <button className="text-gray-400 hover:text-gray-600 text-xl leading-none" onClick={onClose}>
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading folio...</div>
        ) : !invoice ? (
          /* ── Create draft folio ── */
          <div className="space-y-4">
            <div className="card p-5 bg-gray-50 space-y-4">
              <p className="text-sm text-gray-600">
                No folio exists for this booking yet. Create a draft to start adding charges — the guest
                won't see it until you issue it.
              </p>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={includeRoomCharge}
                  onChange={(e) => setIncludeRoomCharge(e.target.checked)}
                />
                Include room charge{roomCharges.length !== 1 ? 's' : ''} —{' '}
                {roomCharges.length} room{roomCharges.length !== 1 ? 's' : ''} × {nightsLabel} ={' '}
                {fmt(roomChargeTotal)}
              </label>
              {isOta && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  {humanize(booking.source)} booking — room is usually paid through the OTA, so the room
                  charge is excluded by default.
                </p>
              )}
            </div>
            <button className="btn-primary w-full" disabled={saving} onClick={createFolio}>
              {saving ? 'Creating...' : 'Create Draft Folio'}
            </button>
          </div>
        ) : (
          <>
            {/* ── Status row ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-blue-700">{invoice.invoiceNumber}</span>
                <span className={`badge ${STATUS_BADGE[invoice.status] ?? 'badge-gray'}`}>
                  {invoice.status.replace('_', ' ')}
                </span>
                {isDraft && <span className="text-xs text-gray-500">Hidden from guest until issued</span>}
              </div>
              {isDraft && (
                <button className="btn-primary text-sm" disabled={saving} onClick={issueInvoice}>
                  Issue to Guest
                </button>
              )}
            </div>

            {/* ── Line items ── */}
            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 font-semibold text-gray-800 text-sm">
                Charges
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Description', 'Qty', 'Unit Price', 'Total', ''].map((h, i) => (
                      <th key={i} className="text-left px-4 py-2 text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                        No charges yet — add a line item below.
                      </td>
                    </tr>
                  )}
                  {invoice.items.map((item) =>
                    editItemId === item.id ? (
                      <tr key={item.id} className="bg-blue-50/50">
                        <td className="px-4 py-2">
                          <input className="input" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                        </td>
                        <td className="px-4 py-2 w-20">
                          <input
                            type="number" min={1} className="input"
                            value={editQty} onChange={(e) => setEditQty(e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2 w-28">
                          <input
                            type="number" min={0} step="0.01" className="input"
                            value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2 font-medium whitespace-nowrap">
                          {fmt((Math.max(1, parseInt(editQty, 10) || 1)) * (parseFloat(editPrice) || 0))}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right">
                          <button
                            className="text-blue-600 hover:text-blue-800 font-medium mr-3"
                            disabled={saving || !editDesc.trim()}
                            onClick={saveEdit}
                          >
                            Save
                          </button>
                          <button className="text-gray-400 hover:text-gray-600" onClick={() => setEditItemId(null)}>
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={item.id}>
                        <td className="px-4 py-2">
                          {item.description}
                          {item.serviceRequestId && (
                            <span className="ml-2 text-xs text-purple-600 bg-purple-50 rounded px-1.5 py-0.5">
                              service
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-2 text-gray-600">{fmt(item.unitPrice)}</td>
                        <td className="px-4 py-2 font-medium">{fmt(item.totalPrice)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-right">
                          {canEdit && (
                            <>
                              <button
                                className="text-blue-600 hover:text-blue-800 font-medium mr-3"
                                onClick={() => startEdit(item)}
                              >
                                Edit
                              </button>
                              <button
                                className="text-red-500 hover:text-red-700 font-medium"
                                disabled={saving}
                                onClick={() => removeItem(item.id)}
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>

              {/* Add line item */}
              {canEdit && (
                <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50/60">
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="flex-1 min-w-44">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <input
                        className="input" placeholder="e.g. Minibar, Towels, Spa..."
                        value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                      />
                    </div>
                    <div className="w-20">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                      <input
                        type="number" min={1} className="input"
                        value={newQty} onChange={(e) => setNewQty(e.target.value)}
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price</label>
                      <input
                        type="number" min={0} step="0.01" className="input" placeholder="0.00"
                        value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn-primary"
                      disabled={saving || !newDesc.trim() || newPrice === ''}
                      onClick={addManualItem}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap text-sm">
                    {missingRoomCharges.map((rc) => (
                      <button
                        key={rc.description}
                        className="btn-secondary text-sm"
                        disabled={saving}
                        onClick={() => addRoomCharge(rc)}
                      >
                        + {rc.description} ({fmt(rc.unitPrice * nights)})
                      </button>
                    ))}
                    <button
                      className="btn-secondary text-sm"
                      onClick={() => {
                        setShowPicker(!showPicker);
                        if (!showPicker) loadBillable();
                      }}
                    >
                      + From service requests ({billable.length})
                    </button>
                  </div>

                  {/* Billable service requests picker */}
                  {showPicker && (
                    <div className="border border-gray-200 rounded-lg bg-white divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {billable.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4 px-3">
                          No unbilled service requests — complete and price a request first (Service
                          Queue → set cost).
                        </p>
                      ) : (
                        billable.map((sr) => (
                          <div key={sr.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                            <div className="min-w-0">
                              <span className="font-mono text-xs text-blue-700 mr-2">{sr.ticketNumber}</span>
                              <span className="font-medium">{humanize(sr.type)}</span>
                              <span className="text-gray-500"> — {sr.description}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-semibold">{fmt(sr.actualCost ?? sr.estimatedCost ?? 0)}</span>
                              <button
                                className="text-blue-600 hover:text-blue-800 font-medium"
                                disabled={saving}
                                onClick={() => addServiceItem(sr.id)}
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Totals + adjustments ── */}
            <div className="card p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{fmt(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{fmt(invoice.taxAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Discount</span>
                {canEdit ? (
                  <span className="flex items-center gap-2">
                    −$
                    <input
                      type="number" min={0} step="0.01"
                      className="input w-24 text-right py-1"
                      value={discountDraft}
                      onChange={(e) => setDiscountDraft(e.target.value)}
                    />
                  </span>
                ) : (
                  <span>−{fmt(invoice.discountAmount)}</span>
                )}
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Due date</span>
                {canEdit ? (
                  <input
                    type="date"
                    className="input w-40 py-1"
                    value={dueDateDraft}
                    onChange={(e) => setDueDateDraft(e.target.value)}
                  />
                ) : (
                  <span>{format(new Date(invoice.dueDate), 'dd MMM yyyy')}</span>
                )}
              </div>
              {canEdit &&
                (parseFloat(discountDraft || '0') !== Number(invoice.discountAmount) ||
                  dueDateDraft !== format(new Date(invoice.dueDate), 'yyyy-MM-dd')) && (
                  <div className="flex justify-end pt-1">
                    <button className="btn-secondary text-sm" disabled={saving} onClick={saveAdjustments}>
                      Save changes
                    </button>
                  </div>
                )}
              <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-100 mt-1">
                <span>Total</span>
                <span>{fmt(invoice.totalAmount)}</span>
              </div>
              {Number(invoice.paidAmount) > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Paid</span>
                  <span>−{fmt(invoice.paidAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span className={Number(invoice.balanceDue) <= 0 ? 'text-green-700' : 'text-gray-900'}>
                  Balance Due
                </span>
                <span className={Number(invoice.balanceDue) <= 0 ? 'text-green-700' : 'text-gray-900'}>
                  {fmt(invoice.balanceDue)}
                </span>
              </div>
            </div>

            {/* ── Payments ── */}
            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                <span className="font-semibold text-gray-800 text-sm">Payments</span>
                {canEdit && Number(invoice.balanceDue) > 0 && !showPayForm && (
                  <button
                    className="btn-secondary text-sm"
                    onClick={() => {
                      setPayAmount(String(Number(invoice.balanceDue)));
                      setShowPayForm(true);
                    }}
                  >
                    Record Payment
                  </button>
                )}
              </div>

              {showPayForm && (
                <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex gap-2 items-end flex-wrap">
                  <div className="w-28">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                    <input
                      type="number" min={0.01} step="0.01" className="input"
                      value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                    />
                  </div>
                  <div className="w-40">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
                    <select
                      className="input"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    >
                      {Object.values(PaymentMethod).map((m) => (
                        <option key={m} value={m}>{humanize(m)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-36">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <input
                      className="input" placeholder="Optional"
                      value={payNotes} onChange={(e) => setPayNotes(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn-primary"
                    disabled={saving || !(parseFloat(payAmount) > 0)}
                    onClick={recordPayment}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn-secondary" onClick={() => setShowPayForm(false)}>
                    Cancel
                  </button>
                </div>
              )}

              {invoice.payments.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-5">No payments yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {invoice.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-2 font-mono text-xs text-blue-700">{p.paymentNumber}</td>
                        <td className="px-4 py-2 text-gray-600">{humanize(p.method)}</td>
                        <td className="px-4 py-2 text-gray-500">
                          {format(new Date(p.createdAt), 'dd MMM yyyy HH:mm')}
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{p.notes}</td>
                        <td className="px-4 py-2 font-medium text-right">{fmt(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
