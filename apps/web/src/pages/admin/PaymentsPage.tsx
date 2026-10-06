import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  ArrowUUpLeftIcon,
  BankIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  DeviceMobileIcon,
  HourglassIcon,
  MoneyIcon,
  ReceiptIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import api from '@/lib/api';
import { PaymentMethod } from '@shared/index';
import {
  Avatar,
  EmptyState,
  ErrorState,
  Panel,
  PageHeader,
  SkeletonRows,
  StatTile,
  fadeItem,
  humanize,
  int,
  money,
  riseItem,
  stagger,
} from '@/components/admin/ui';

interface Payment {
  id: string;
  paymentNumber: string;
  amount: number;
  method: string;
  status: string;
  stripePaymentId?: string;
  processedAt?: string;
  createdAt: string;
  invoice: {
    invoiceNumber: string;
    totalAmount: number;
    booking: {
      bookingNumber: string;
      guest: { firstName: string; lastName: string; email: string };
    };
  };
}

const STATUS_BADGE: Record<string, { cls: string; icon: Icon }> = {
  COMPLETED: { cls: 'badge-green', icon: CheckCircleIcon },
  PENDING: { cls: 'badge-yellow', icon: HourglassIcon },
  PROCESSING: { cls: 'badge-blue', icon: CircleNotchIcon },
  FAILED: { cls: 'badge-red', icon: XCircleIcon },
  REFUNDED: { cls: 'badge-gray', icon: ArrowUUpLeftIcon },
};

const METHOD: Record<string, { label: string; icon: Icon }> = {
  [PaymentMethod.CREDIT_CARD]: { label: 'Credit card', icon: CreditCardIcon },
  [PaymentMethod.DEBIT_CARD]: { label: 'Debit card', icon: CreditCardIcon },
  [PaymentMethod.CASH]: { label: 'Cash', icon: MoneyIcon },
  [PaymentMethod.BANK_TRANSFER]: { label: 'Bank transfer', icon: BankIcon },
  [PaymentMethod.DIGITAL_WALLET]: { label: 'Digital wallet', icon: DeviceMobileIcon },
};

const COLUMNS = ['Payment #', 'Guest', 'Booking', 'Invoice', 'Amount', 'Method', 'Status', 'Date'];

/** Rows past this index render without the waterfall so long lists don't trickle in. */
const STAGGER_CAP = 14;

const usd = (n: number) => money(n, { cents: true });

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get('/payments');
      setPayments(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const totalRevenue = payments
    .filter((p) => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const completedCount = payments.filter((p) => p.status === 'COMPLETED').length;
  const pendingCount = payments.filter((p) => p.status === 'PENDING').length;
  const noData = error && payments.length === 0;

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Revenue"
        title="Payments"
        description="Card, cash and transfer payments recorded against guest invoices."
      />

      <motion.div
        className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <StatTile
          variants={riseItem}
          emphasis
          label="Total collected"
          icon={CurrencyDollarIcon}
          loading={loading}
          value={noData ? '—' : totalRevenue}
          format={usd}
          hint={noData ? undefined : 'Sum of completed payments'}
        />
        <StatTile
          variants={riseItem}
          label="Completed"
          icon={CheckCircleIcon}
          loading={loading}
          value={noData ? '—' : completedCount}
          format={int}
        />
        <StatTile
          variants={riseItem}
          label="Pending"
          icon={HourglassIcon}
          loading={loading}
          value={noData ? '—' : pendingCount}
          format={int}
        />
      </motion.div>

      <Panel
        flush
        eyebrow="Ledger"
        title={
          <span className="flex items-baseline gap-2">
            Transactions
            {!loading && (
              <span className="font-mono text-sm font-normal tabular-nums text-zinc-400">{payments.length}</span>
            )}
          </span>
        }
      >
        {error && (
          <div className="px-6 pb-5 md:px-8">
            <ErrorState title="Couldn't load payments" onRetry={load} />
          </div>
        )}

        {loading ? (
          <SkeletonRows rows={6} className="mt-1 border-t border-zinc-100 px-6 md:px-8" />
        ) : payments.length === 0 ? (
          !error && (
            <EmptyState
              icon={ReceiptIcon}
              className="mt-1 border-t border-zinc-100"
              title="No payments recorded yet"
              description="Payments appear here when a guest pays their bill online or staff record a payment on a booking's folio."
            />
          )
        ) : (
          <div className="relative mt-1 overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="border-y border-zinc-100">
                <tr>
                  {COLUMNS.map((h) => (
                    <th
                      key={h}
                      className={`whitespace-nowrap px-4 py-3 first:pl-6 last:pr-6 md:first:pl-8 md:last:pr-8 ${
                        h === 'Amount' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody
                className="divide-y divide-zinc-100"
                variants={stagger}
                initial="hidden"
                animate="show"
              >
                {payments.map((p, i) => {
                  const guest = p.invoice.booking.guest;
                  const status = STATUS_BADGE[p.status];
                  const StatusIcon = status?.icon;
                  const method = METHOD[p.method];
                  const MethodIcon = method?.icon ?? CreditCardIcon;
                  return (
                    <motion.tr key={p.id} variants={i < STAGGER_CAP ? fadeItem : undefined}>
                      <td className="whitespace-nowrap py-3.5 pl-6 pr-4 font-mono text-xs tabular-nums text-lagoon-700 md:pl-8">
                        {p.paymentNumber}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar firstName={guest.firstName} lastName={guest.lastName} size="sm" />
                          <span className="whitespace-nowrap font-medium text-zinc-900">
                            {guest.firstName} {guest.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs tabular-nums text-zinc-700">
                        {p.invoice.booking.bookingNumber}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs tabular-nums text-zinc-500">
                        {p.invoice.invoiceNumber}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono font-medium tabular-nums text-zinc-900">
                        {usd(Number(p.amount))}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-2 whitespace-nowrap text-zinc-600">
                          <MethodIcon size={16} weight="regular" className="text-zinc-400" />
                          {method?.label ?? humanize(p.method)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`badge ${status?.cls ?? 'badge-gray'}`}>
                          {StatusIcon && <StatusIcon size={12} weight="regular" />}
                          {humanize(p.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-3.5 pl-4 pr-6 font-mono text-xs tabular-nums text-zinc-500 md:pr-8">
                        {format(new Date(p.processedAt ?? p.createdAt), 'dd MMM yyyy HH:mm')}
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
