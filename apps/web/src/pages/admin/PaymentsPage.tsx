import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';

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

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: 'badge-green',
  PENDING: 'badge-yellow',
  PROCESSING: 'badge-blue',
  FAILED: 'badge-red',
  REFUNDED: 'badge-gray',
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/payments');
      setPayments(data);
    } finally {
      setLoading(false);
    }
  }

  const totalRevenue = payments
    .filter((p) => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Payments</h2>
        <p className="text-gray-500 text-sm mt-1">{payments.length} transactions</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: '💰' },
          { label: 'Completed', value: payments.filter((p) => p.status === 'COMPLETED').length, icon: '✅' },
          { label: 'Pending', value: payments.filter((p) => p.status === 'PENDING').length, icon: '⏳' },
        ].map((stat) => (
          <div key={stat.label} className="card p-5">
            <span className="text-2xl">{stat.icon}</span>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Payment #', 'Guest', 'Booking', 'Invoice', 'Amount', 'Method', 'Status', 'Date'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-700">{p.paymentNumber}</td>
                  <td className="px-4 py-3 font-medium">
                    {p.invoice.booking.guest.firstName} {p.invoice.booking.guest.lastName}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.invoice.booking.bookingNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.invoice.invoiceNumber}</td>
                  <td className="px-4 py-3 font-bold">${Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600">{p.method.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_BADGE[p.status] ?? 'badge-gray'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {format(new Date(p.processedAt ?? p.createdAt), 'dd MMM yyyy HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && (
            <div className="text-center py-12 text-gray-400">No payments yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
