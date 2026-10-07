import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { IGuest, IBooking, BookingStatus } from '@shared/index';
import { roomNumbersLabel } from '@/lib/rooms';
import clsx from 'clsx';
import { CalendarBlankIcon, MagnifyingGlassIcon, PencilSimpleIcon, UserIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { Avatar, EmptyState, PageHeader, Panel, SkeletonRows, humanize } from '@/components/admin/ui';

const STATUS_BADGE: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'badge-yellow',
  [BookingStatus.CONFIRMED]: 'badge-blue',
  [BookingStatus.CHECKED_IN]: 'badge-green',
  [BookingStatus.CHECKED_OUT]: 'badge-gray',
  [BookingStatus.CANCELLED]: 'badge-red',
  [BookingStatus.NO_SHOW]: 'badge-red',
};

export default function StaffGuestsPage() {
  const [guests, setGuests] = useState<IGuest[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IGuest | null>(null);
  const [guestBookings, setGuestBookings] = useState<IBooking[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<IGuest>>({});

  useEffect(() => { load(); }, [search]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/guests', { params: search ? { search } : {} });
      setGuests(data);
    } finally {
      setLoading(false);
    }
  }

  async function selectGuest(g: IGuest) {
    setSelected(g);
    setEditing(false);
    setForm(g);
    const { data } = await api.get(`/guests/${g.id}/bookings`);
    setGuestBookings(data);
  }

  async function handleSave() {
    if (!selected) return;
    try {
      const { data } = await api.patch(`/guests/${selected.id}`, form);
      toast.success('Guest updated');
      setSelected(data);
      setEditing(false);
      load();
    } catch {
      // errors shown by interceptor
    }
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Front desk"
        title="Guests"
        description={loading ? 'Loading guests…' : `${guests.length} ${guests.length === 1 ? 'guest' : 'guests'}${search ? ' match your search' : ''}.`}
        actions={
          <div className="relative w-full md:w-72">
            <MagnifyingGlassIcon size={16} weight="regular" aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              className="input pl-10"
              placeholder="Search name, email, phone…"
              aria-label="Search guests"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel flush className="lg:max-h-[calc(100dvh-14rem)]" bodyClassName="min-h-0">
          {loading ? (
            <SkeletonRows rows={6} className="p-4" />
          ) : guests.length === 0 ? (
            <EmptyState icon={UsersThreeIcon} title="No guests found" description="Try a different name, email or phone number." compact />
          ) : (
            <ul className="max-h-[600px] space-y-0.5 overflow-y-auto p-2 lg:max-h-none">
              {guests.map((g) => {
                const active = selected?.id === g.id;
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      aria-current={active || undefined}
                      className={clsx(
                        'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors duration-200',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-lagoon-500/40',
                        active ? 'bg-lagoon-50 ring-1 ring-inset ring-lagoon-600/15' : 'hover:bg-zinc-50',
                      )}
                      onClick={() => selectGuest(g)}
                    >
                      <Avatar firstName={g.firstName} lastName={g.lastName} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-zinc-900">{g.firstName} {g.lastName}</span>
                        <span className="block truncate text-xs text-zinc-500">{g.email}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-4 lg:col-span-2">
          {!selected ? (
            <Panel>
              <EmptyState icon={UserIcon} title="No guest selected" description="Pick a guest from the list to see their details and booking history." />
            </Panel>
          ) : (
            <>
              <Panel
                eyebrow="Profile"
                title={
                  <span className="flex items-center gap-3">
                    <Avatar firstName={selected.firstName} lastName={selected.lastName} size="lg" />
                    <span className="text-lg">{selected.firstName} {selected.lastName}</span>
                  </span>
                }
                action={
                  <button type="button" className="btn-secondary" onClick={() => setEditing(!editing)}>
                    {!editing && <PencilSimpleIcon size={16} weight="regular" aria-hidden />}
                    {editing ? 'Cancel' : 'Edit'}
                  </button>
                }
              >
                {!editing ? (
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                    {[
                      ['Email', selected.email],
                      ['Phone', selected.phone],
                      ['Country', selected.country || '—'],
                      ['City', selected.city || '—'],
                      ['ID type', selected.idType || '—'],
                      ['ID number', selected.idNumber || '—'],
                      ['Loyalty points', String(selected.loyaltyPoints)],
                      ['Tier', selected.loyaltyTier || 'Standard'],
                    ].map(([label, val]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-xs text-zinc-500">{label}</dt>
                        <dd className="mt-0.5 truncate font-medium text-zinc-900">{val}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                      { key: 'firstName', label: 'First name' },
                      { key: 'lastName', label: 'Last name' },
                      { key: 'phone', label: 'Phone' },
                      { key: 'country', label: 'Country' },
                      { key: 'city', label: 'City' },
                      { key: 'idType', label: 'ID type' },
                      { key: 'idNumber', label: 'ID number' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label htmlFor={`guest-${key}`} className="mb-1.5 block text-xs font-medium text-zinc-600">{label}</label>
                        <input
                          id={`guest-${key}`}
                          className="input"
                          value={(form as any)[key] ?? ''}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <button type="button" className="btn-primary" onClick={handleSave}>Save changes</button>
                    </div>
                  </div>
                )}
              </Panel>

              <Panel
                eyebrow="History"
                title="Bookings"
                flush
                action={<span className="font-mono text-xs tabular-nums text-zinc-500">{guestBookings.length}</span>}
              >
                {guestBookings.length === 0 ? (
                  <EmptyState icon={CalendarBlankIcon} title="No bookings yet" compact />
                ) : (
                  <div className="overflow-x-auto pb-3">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          {['Booking', 'Room', 'Check-in', 'Check-out', 'Status'].map((h) => (
                            <th key={h} className="whitespace-nowrap px-6 py-2.5 text-left md:first:pl-8">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {guestBookings.map((b) => (
                          <tr key={b.id}>
                            <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-lagoon-700 md:pl-8">{b.bookingNumber}</td>
                            <td className="px-6 py-3 font-mono text-xs text-zinc-700">{roomNumbersLabel(b)}</td>
                            <td className="px-6 py-3 text-zinc-500">{format(new Date(b.checkInDate), 'dd MMM yyyy')}</td>
                            <td className="px-6 py-3 text-zinc-500">{format(new Date(b.checkOutDate), 'dd MMM yyyy')}</td>
                            <td className="px-6 py-3">
                              <span className={`badge whitespace-nowrap ${STATUS_BADGE[b.status as BookingStatus]}`}>{humanize(b.status)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
