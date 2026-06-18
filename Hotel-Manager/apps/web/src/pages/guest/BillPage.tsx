import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Initialise Stripe outside component to avoid re-creation
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder',
);

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
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
  paidAt?: string;
  items: InvoiceItem[];
  booking: {
    bookingNumber: string;
    checkInDate: string;
    checkOutDate: string;
    numberOfGuests: number;
    room: { roomNumber: string; category: { name: string } };
    guest: { firstName: string; lastName: string; email: string };
  };
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-gray',
  PENDING: 'badge-yellow',
  PAID: 'badge-green',
  PARTIALLY_PAID: 'badge-blue',
  OVERDUE: 'badge-red',
  CANCELLED: 'badge-gray',
};

// ── Stripe checkout form ──────────────────────────────────────────────────────

function CheckoutForm({ invoiceId, onPaid }: { invoiceId: string; onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/guest/bill?paid=1`,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast.error(error.message ?? 'Payment failed');
    } else {
      toast.success('Payment successful!');
      onPaid();
    }
    setProcessing(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || processing}
        className="btn-primary w-full"
      >
        {processing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

// ── Main bill page ────────────────────────────────────────────────────────────

export default function GuestBillPage() {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [generatingIntent, setGeneratingIntent] = useState(false);

  const bookingId = (user as any)?.bookingId;

  useEffect(() => {
    if (bookingId) loadInvoice(bookingId);
    // Check if returning from Stripe redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === '1') toast.success('Payment recorded!');
  }, [bookingId]);

  async function loadInvoice(bId: string) {
    setLoading(true);
    try {
      const { data } = await api.get(`/invoices/booking/${bId}`).catch(() => ({ data: null }));
      if (data) {
        setInvoice(data);
      } else {
        // No invoice yet — generate it (only if checked in)
        const { data: generated } = await api.post(`/invoices/booking/${bId}/generate`).catch(() => ({ data: null }));
        if (generated) setInvoice(generated);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePayClick() {
    if (!invoice) return;
    setGeneratingIntent(true);
    try {
      const { data } = await api.post('/payments/intent', { invoiceId: invoice.id });
      setClientSecret(data.clientSecret);
      setShowPayment(true);
    } catch {
      // errors shown by interceptor
    } finally {
      setGeneratingIntent(false);
    }
  }

  function handlePaid() {
    setShowPayment(false);
    setClientSecret(null);
    if (bookingId) loadInvoice(bookingId);
  }

  const isPaid = invoice?.status === 'PAID';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">My Bill</h2>
        <p className="text-gray-500 text-sm mt-1">View your charges and pay online.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading invoice...</div>
      ) : !invoice ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-3xl mb-2">🧾</p>
          <p>No invoice available yet. Check back after check-in.</p>
        </div>
      ) : (
        <>
          {/* Invoice header */}
          <div className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-blue-700">{invoice.invoiceNumber}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Issued {format(new Date(invoice.issuedAt), 'dd MMM yyyy')}
                </p>
              </div>
              <span className={`badge ${STATUS_BADGE[invoice.status] ?? 'badge-gray'}`}>
                {invoice.status.replace('_', ' ')}
              </span>
            </div>

            {/* Booking summary */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm grid grid-cols-2 gap-2">
              <div>
                <p className="text-gray-500 text-xs">Booking</p>
                <p className="font-medium">{invoice.booking.bookingNumber}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Room</p>
                <p className="font-medium">
                  #{invoice.booking.room.roomNumber} — {invoice.booking.room.category.name}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Check-in</p>
                <p className="font-medium">
                  {format(new Date(invoice.booking.checkInDate), 'dd MMM yyyy')}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Check-out</p>
                <p className="font-medium">
                  {format(new Date(invoice.booking.checkOutDate), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-800 text-sm">
              Charges
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Description', 'Qty', 'Unit Price', 'Total'].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">{item.description}</td>
                    <td className="px-4 py-2 text-gray-600">{item.quantity}</td>
                    <td className="px-4 py-2 text-gray-600">${Number(item.unitPrice).toFixed(2)}</td>
                    <td className="px-4 py-2 font-medium">${Number(item.totalPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-gray-200 px-4 py-3 space-y-1.5 text-sm">
              {[
                ['Subtotal', invoice.subtotal],
                ['Tax (10%)', invoice.taxAmount],
                ...(Number(invoice.discountAmount) > 0
                  ? [['Discount', -Number(invoice.discountAmount)]]
                  : []),
              ].map(([label, amount]) => (
                <div key={label as string} className="flex justify-between text-gray-600">
                  <span>{label}</span>
                  <span>${Number(amount).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100 mt-1">
                <span>Total</span>
                <span>${Number(invoice.totalAmount).toFixed(2)}</span>
              </div>
              {Number(invoice.paidAmount) > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Paid</span>
                  <span>−${Number(invoice.paidAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-1">
                <span className={Number(invoice.balanceDue) <= 0 ? 'text-green-700' : 'text-gray-900'}>
                  Balance Due
                </span>
                <span className={Number(invoice.balanceDue) <= 0 ? 'text-green-700' : 'text-gray-900'}>
                  ${Number(invoice.balanceDue).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Pay button */}
          {!isPaid && Number(invoice.balanceDue) > 0 && (
            <div className="card p-4">
              {!showPayment ? (
                <button
                  className="btn-primary w-full"
                  onClick={handlePayClick}
                  disabled={generatingIntent}
                >
                  {generatingIntent ? 'Preparing payment...' : `Pay $${Number(invoice.balanceDue).toFixed(2)}`}
                </button>
              ) : clientSecret ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Complete Payment</h3>
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm invoiceId={invoice.id} onPaid={handlePaid} />
                  </Elements>
                  <button
                    className="btn-secondary w-full text-sm"
                    onClick={() => { setShowPayment(false); setClientSecret(null); }}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {isPaid && (
            <div className="card p-4 bg-green-50 border border-green-200 text-center text-green-800 text-sm font-medium">
              ✓ Paid in full{invoice.paidAt && ` on ${format(new Date(invoice.paidAt), 'dd MMM yyyy HH:mm')}`}
            </div>
          )}
        </>
      )}
    </div>
  );
}
