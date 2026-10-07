import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { MagnifyingGlassIcon, UsersIcon } from '@phosphor-icons/react';
import api from '@/lib/api';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { IGuest } from '@shared/index';
import { format } from 'date-fns';
import {
  Avatar,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  SkeletonRows,
  fadeItem,
  riseItem,
  stagger,
} from '@/components/admin/ui';

const COLUMNS = ['Name', 'Email', 'Phone', 'Country', 'Loyalty points', 'Joined'];

export default function AdminGuestsPage() {
  const [guests, setGuests] = useState<IGuest[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const query = useDebouncedValue(search);

  useEffect(() => {
    load();
  }, [query]);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get('/guests', {
        params: query ? { search: query } : {},
      });
      setGuests(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  // First load shows a skeleton; later refetches (typing) dim the rows instead.
  const initialLoad = loading && guests.length === 0;

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Guests"
        description={
          initialLoad || error ? (
            'Guest profiles, contact details and loyalty points.'
          ) : (
            <>
              <span className="font-mono tabular-nums text-zinc-700">{guests.length}</span>{' '}
              {guests.length === 1 ? 'guest' : 'guests'} · profiles, contact details and loyalty points
            </>
          )
        }
        actions={
          <label className="relative block w-full md:w-72">
            <span className="sr-only">Search guests</span>
            <MagnifyingGlassIcon
              size={16}
              weight="regular"
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              className="input pl-10"
              placeholder="Name, email or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        }
      />

      <Panel flush className="overflow-hidden" variants={riseItem} initial="hidden" animate="show">
        {initialLoad ? (
          <SkeletonRows rows={8} className="px-6" />
        ) : error ? (
          <div className="p-4 md:p-6">
            <ErrorState title="Couldn't load guests" onRetry={load} />
          </div>
        ) : guests.length === 0 ? (
          search ? (
            <EmptyState
              icon={MagnifyingGlassIcon}
              title="No guests match"
              description="Search looks at name, email and phone. Check the spelling or try fewer characters."
              action={
                <button type="button" className="btn-secondary" onClick={() => setSearch('')}>
                  Clear search
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={UsersIcon}
              title="No guests yet"
              description="Guests appear here once a booking is created."
            />
          )
        ) : (
          <div
            aria-busy={loading}
            className={clsx('relative overflow-x-auto transition-opacity duration-300', loading && 'opacity-60')}
          >
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-zinc-100">
                <tr>
                  {COLUMNS.map((h, i) => (
                    <th
                      key={h}
                      className={clsx(
                        'whitespace-nowrap py-3 text-left',
                        i === 0 ? 'pl-6 pr-4' : i === COLUMNS.length - 1 ? 'pl-4 pr-6' : 'px-4',
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody
                variants={stagger}
                initial="hidden"
                animate="show"
                className="divide-y divide-zinc-100"
              >
                {guests.map((g) => (
                  <motion.tr key={g.id} variants={fadeItem}>
                    <td className="py-3 pl-6 pr-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar firstName={g.firstName} lastName={g.lastName} size="sm" />
                        <span className="whitespace-nowrap font-medium text-zinc-900">
                          {g.firstName} {g.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{g.email}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] tabular-nums text-zinc-600">
                      {g.phone}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{g.country || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-lagoon-50 px-2 py-0.5 text-[11px] font-medium text-lagoon-800 ring-1 ring-inset ring-lagoon-600/20">
                        <span className="font-mono tabular-nums">{g.loyaltyPoints}</span>
                        pts
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-3 pl-4 pr-6 font-mono text-[13px] tabular-nums text-zinc-500">
                      {format(new Date(g.createdAt), 'dd MMM yyyy')}
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
