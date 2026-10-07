import { ReactNode, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { CheckCircleIcon, LockSimpleIcon, ReceiptIcon } from '@phosphor-icons/react';
import clsx from 'clsx';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import type { Appearance } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useMediaQuery } from '@/components/admin/shell/hooks';
import { riseItem, stagger } from '@/components/admin/ui/motion';
import { humanize, money, stayDate } from '@/components/guest/format';
import { Badge, EmptyNote, ErrorNote, PageIntro, Pending, Skeleton, Tone } from '@/components/guest/ui';

// Initialise Stripe outside component to avoid re-creation
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder',
);

// The payment form lives in Stripe's iframe, so it gets the portal's tokens as literal values
const STRIPE_FONTS = [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Jost:wght@400;500&display=swap' }];

function stripeAppearance(dark: boolean): Appearance {
  return {
    theme: dark ? 'night' : 'stripe',
    variables: {
      colorPrimary: dark ? '#e08058' : '#9a4527',
      colorBackground: dark ? '#2a211b' : '#fffdf8',
      colorText: dark ? '#f2eadd' : '#3a2a1f',
      colorTextSecondary: dark ? '#b8a896' : '#6b5849',
      colorDanger: dark ? '#f0866f' : '#a82c1e',
      fontFamily: 'Jost, ui-sans-serif, system-ui, sans-serif',
      borderRadius: '16px',
    },
    rules: {
      '.Input': {
        border: `1px solid ${dark ? 'rgb(242 234 221 / 0.15)' : 'rgb(58 42 31 / 0.15)'}`,
        boxShadow: 'none',
      },
    },
  };
}

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
    rooms: { room: { roomNumber: string; category: { name: string } } }[];
    guest: { firstName: string; lastName: string; email: string };
  };
}

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  PENDING: { label: 'Pending', tone: 'gold' },
  PAID: { label: 'Paid', tone: 'palm' },
  PARTIALLY_PAID: { label: 'Partially paid', tone: 'clay' },
  OVERDUE: { label: 'Overdue', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

const cents = (n: number | string) => money(n, { cents: true });

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
    <form onSubmit={handleSubmit} className="grid gap-4">
      <PaymentElement />
      <button type="submit" disabled={!stripe || processing} className="btn-accent w-full">
        {processing ? <Pending>Processing…</Pending> : 'Pay Now'}
      </button>
    </form>
  );
}

// ── Main bill page ────────────────────────────────────────────────────────────

export default function GuestBillPage() {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [generatingIntent, setGeneratingIntent] = useState(false);
  const dark = useMediaQuery('(prefers-color-scheme: dark)');
  const appearance = useMemo(() => stripeAppearance(dark), [dark]);

  const bookingId = user?.bookingId;

  useEffect(() => {
    if (bookingId) loadInvoice(bookingId);
    else setLoading(false);
    // Check if returning from Stripe redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === '1') toast.success('Payment recorded!');
  }, [bookingId]);

  async function loadInvoice(bId: string) {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get(`/invoices/booking/${bId}`);
      setInvoice(data ?? null);
    } catch (err) {
      // Read-only: the bill appears once staff issue it (404 until then)
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) setInvoice(null);
      else setLoadError(true);
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

  function cancelPayment() {
    setShowPayment(false);
    setClientSecret(null);
  }

  function handlePaid() {
    cancelPayment();
    if (bookingId) loadInvoice(bookingId);
  }

  return (
    <div>
      <PageIntro title="My Bill" description="View your charges and pay online." />

      <div className="mt-8">
        {loading ? (
          <BillSkeleton />
        ) : loadError ? (
          <div className="max-w-3xl">
            <ErrorNote title="Couldn’t load your bill" onRetry={() => bookingId && loadInvoice(bookingId)} />
          </div>
        ) : !invoice ? (
          <div className="max-w-3xl">
            <EmptyNote icon={ReceiptIcon} title="No bill yet">
              It will appear here once our staff issue it.
            </EmptyNote>
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8"
          >
            <motion.div variants={riseItem} className="lg:sticky lg:top-24 lg:col-span-5 lg:col-start-8 lg:row-start-1">
              <BalancePanel
                invoice={invoice}
                payment={
                  showPayment && clientSecret ? (
                    <div className="grid gap-4">
                      <h2 className="text-[15px] font-medium">Complete Payment</h2>
                      <Elements
                        stripe={stripePromise}
                        options={{ clientSecret, appearance, fonts: STRIPE_FONTS }}
                      >
                        <CheckoutForm invoiceId={invoice.id} onPaid={handlePaid} />
                      </Elements>
                      <button type="button" className="btn-ghost w-full" onClick={cancelPayment}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-accent w-full"
                      onClick={handlePayClick}
                      disabled={generatingIntent}
                    >
                      {generatingIntent ? (
                        <Pending>Preparing payment…</Pending>
                      ) : (
                        <>
                          <LockSimpleIcon size={18} aria-hidden />
                          Pay {cents(invoice.balanceDue)}
                        </>
                      )}
                    </button>
                  )
                }
              />
            </motion.div>
            <motion.div variants={riseItem} className="lg:col-span-7 lg:col-start-1 lg:row-start-1">
              <ChargesPanel invoice={invoice} />
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function BalancePanel({ invoice, payment }: { invoice: Invoice; payment: ReactNode }) {
  const isPaid = invoice.status === 'PAID';
  const balance = Number(invoice.balanceDue);
  const status = STATUS_META[invoice.status] ?? { label: humanize(invoice.status), tone: 'neutral' as Tone };
  const rooms = invoice.booking.rooms;

  return (
    <section aria-label="Balance" className="card p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-guest-muted">Balance due</p>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <p
        className={clsx(
          'mt-2 text-[2.75rem] font-light leading-none tracking-tight tabular-nums',
          balance <= 0 && 'text-guest-palm',
        )}
      >
        {cents(balance)}
      </p>

      {isPaid ? (
        <p className="mt-6 flex items-start gap-2.5 rounded-2xl bg-guest-palm/10 px-4 py-3 text-sm text-guest-palm">
          <CheckCircleIcon size={18} weight="fill" aria-hidden className="mt-px shrink-0" />
          Paid in full{invoice.paidAt && ` on ${format(new Date(invoice.paidAt), 'd MMM yyyy, HH:mm')}`}
        </p>
      ) : (
        balance > 0 && <div className="mt-6">{payment}</div>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-guest-ink/[0.07] pt-5 text-sm">
        <Detail label="Invoice">{invoice.invoiceNumber}</Detail>
        <Detail label="Issued">{format(new Date(invoice.issuedAt), 'd MMM yyyy')}</Detail>
        <Detail label="Booking">{invoice.booking.bookingNumber}</Detail>
        <Detail label={`Room${rooms.length !== 1 ? 's' : ''}`}>
          {rooms.map((r) => (
            <span key={r.room.roomNumber} className="block">
              {r.room.roomNumber}, {r.room.category.name}
            </span>
          ))}
        </Detail>
        <Detail label="Check-in">{format(stayDate(invoice.booking.checkInDate), 'd MMM yyyy')}</Detail>
        <Detail label="Check-out">{format(stayDate(invoice.booking.checkOutDate), 'd MMM yyyy')}</Detail>
      </dl>
    </section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-guest-muted">{label}</dt>
      <dd className="mt-1 break-words font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function ChargesPanel({ invoice }: { invoice: Invoice }) {
  const { items } = invoice;
  const discount = Number(invoice.discountAmount);
  const paid = Number(invoice.paidAmount);

  return (
    <section aria-labelledby="bill-charges" className="card">
      <header className="flex items-baseline justify-between gap-3 px-6 pb-1 pt-6 sm:px-7">
        <h2 id="bill-charges" className="font-cormorant text-[1.75rem] font-semibold leading-none">
          Charges
        </h2>
        <span className="text-xs tabular-nums text-guest-muted">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </header>

      {items.length === 0 ? (
        <p className="px-6 py-5 text-sm text-guest-muted sm:px-7">No charges on this bill yet.</p>
      ) : (
        <ul className="divide-y divide-guest-ink/[0.07] px-6 sm:px-7">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="break-words text-[15px] leading-snug">{item.description}</p>
                <p className="mt-1 text-xs tabular-nums text-guest-muted">
                  {item.quantity} × {cents(item.unitPrice)}
                </p>
              </div>
              <p className="shrink-0 text-[15px] font-medium tabular-nums">{cents(item.totalPrice)}</p>
            </li>
          ))}
        </ul>
      )}

      <dl className="m-3 mt-1 grid gap-2.5 rounded-[1.25rem] bg-guest-ink/[0.035] p-4 text-sm sm:m-4 sm:mt-1 sm:p-5">
        <TotalRow label="Subtotal" value={cents(invoice.subtotal)} />
        <TotalRow label="Tax" value={cents(invoice.taxAmount)} />
        {discount > 0 && <TotalRow label="Discount" value={`−${cents(discount)}`} />}
        <TotalRow label="Total" value={cents(invoice.totalAmount)} strong className="border-t border-guest-ink/10 pt-2.5" />
        {paid > 0 && <TotalRow label="Paid" value={`−${cents(paid)}`} className="text-guest-palm" />}
        <TotalRow
          label="Balance due"
          value={cents(invoice.balanceDue)}
          strong
          className={Number(invoice.balanceDue) <= 0 ? 'text-guest-palm' : undefined}
        />
      </dl>
    </section>
  );
}

function TotalRow({
  label,
  value,
  strong,
  className,
}: {
  label: string;
  value: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx('flex items-baseline justify-between gap-4', strong && 'font-medium', className)}>
      <dt className={clsx(!strong && !className && 'text-guest-muted')}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function BillSkeleton() {
  return (
    <div role="status" aria-label="Loading your bill" className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
      <div className="card p-6 sm:p-7 lg:col-span-5 lg:col-start-8 lg:row-start-1">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="mt-3 h-11 w-44 rounded-2xl" />
        <Skeleton className="mt-6 h-11 rounded-full" />
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-guest-ink/[0.07] pt-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-3 w-14 rounded-full" />
              <Skeleton className="mt-2 h-3.5 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="card p-6 sm:p-7 lg:col-span-7 lg:col-start-1 lg:row-start-1">
        <Skeleton className="h-7 w-28 rounded-xl" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="mt-6 flex justify-between gap-4">
            <div className="flex-1">
              <Skeleton className="h-3.5 w-3/5 rounded-full" />
              <Skeleton className="mt-2 h-3 w-24 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
