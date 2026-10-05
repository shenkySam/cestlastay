import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { IGuest } from '@shared/index';
import { format } from 'date-fns';

export default function AdminGuestsPage() {
  const [guests, setGuests] = useState<IGuest[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [search]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/guests', {
        params: search ? { search } : {},
      });
      setGuests(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Guests</h2>
        <p className="text-gray-500 text-sm mt-1">{guests.length} guests</p>
      </div>

      <input
        className="input w-72"
        placeholder="Search by name, email or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Email', 'Phone', 'Country', 'Loyalty Points', 'Joined'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {guests.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{g.firstName} {g.lastName}</td>
                  <td className="px-4 py-3 text-gray-600">{g.email}</td>
                  <td className="px-4 py-3 text-gray-600">{g.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{g.country || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-blue">{g.loyaltyPoints} pts</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {format(new Date(g.createdAt), 'dd MMM yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {guests.length === 0 && (
            <div className="text-center py-12 text-gray-400">No guests found.</div>
          )}
        </div>
      )}
    </div>
  );
}
