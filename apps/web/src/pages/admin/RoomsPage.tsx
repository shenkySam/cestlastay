import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { BedIcon, FunnelSimpleIcon, PencilSimpleIcon, PlusIcon, TrashIcon, WrenchIcon } from '@phosphor-icons/react';
import api from '@/lib/api';
import { IRoom, IRoomCategory, RoomStatus } from '@shared/index';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FilterPills,
  Modal,
  ModalBody,
  ModalFooter,
  PageHeader,
  Panel,
  Skeleton,
  StatusDot,
  humanize,
  riseItem,
  stagger,
} from '@/components/admin/ui';
import type { SegmentOption, Tone } from '@/components/admin/ui';

/** Status light per room state. Occupied and reserved share lagoon; only occupied breathes. */
const STATUS_TONE: Record<RoomStatus, { tone: Tone; pulse: boolean }> = {
  [RoomStatus.AVAILABLE]: { tone: 'emerald', pulse: false },
  [RoomStatus.OCCUPIED]: { tone: 'lagoon', pulse: true },
  [RoomStatus.RESERVED]: { tone: 'lagoon', pulse: false },
  [RoomStatus.CLEANING]: { tone: 'amber', pulse: true },
  [RoomStatus.MAINTENANCE]: { tone: 'rose', pulse: true },
  [RoomStatus.OUT_OF_ORDER]: { tone: 'rose', pulse: true },
};

const STATUS_OPTIONS: SegmentOption<string>[] = [
  { value: '', label: 'All' },
  ...Object.values(RoomStatus).map((s) => ({
    value: s,
    label: (
      <>
        <StatusDot tone={STATUS_TONE[s].tone} pulse={false} />
        {humanize(s)}
      </>
    ),
  })),
];

const EMPTY_ROOM = { roomNumber: '', categoryId: '', floor: 1, maintenanceNotes: '' };

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [categories, setCategories] = useState<IRoomCategory[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<IRoom | null>(null);
  const [form, setForm] = useState(EMPTY_ROOM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Enter now submits the form, so guard against a second request in flight
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [pendingDelete, setPendingDelete] = useState<IRoom | null>(null);

  // Keeps the dialog title stable while it animates out after `pendingDelete` clears.
  const lastPending = useRef<IRoom | null>(null);
  if (pendingDelete) lastPending.current = pendingDelete;
  const deleteTarget = pendingDelete ?? lastPending.current;

  useEffect(() => {
    load();
  }, [filterStatus]);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const [roomsRes, catsRes] = await Promise.all([
        api.get('/rooms', { params: filterStatus ? { status: filterStatus } : {} }),
        api.get('/rooms/categories'),
      ]);
      setRooms(roomsRes.data);
      setCategories(catsRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_ROOM);
    setShowModal(true);
  }

  function openEdit(room: IRoom) {
    setEditing(room);
    setForm({
      roomNumber: room.roomNumber,
      categoryId: room.categoryId,
      floor: room.floor,
      maintenanceNotes: room.maintenanceNotes ?? '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/rooms/${editing.id}`, {
          categoryId: form.categoryId,
          floor: Number(form.floor),
          maintenanceNotes: form.maintenanceNotes || undefined,
        });
        toast.success('Room updated');
      } else {
        await api.post('/rooms', { ...form, floor: Number(form.floor) });
        toast.success('Room created');
      }
      setShowModal(false);
      load();
    } catch {
      // errors shown by interceptor
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleSave();
  }

  function handleDelete(room: IRoom) {
    setPendingDelete(room);
  }

  async function confirmDelete() {
    const room = pendingDelete;
    if (!room) return;
    try {
      await api.delete(`/rooms/${room.id}`);
      toast.success('Room deleted');
      load();
    } catch {
      // errors shown by interceptor
    }
    setPendingDelete(null);
  }

  // Server returns rooms ordered by floor, then room number.
  const floors = Array.from(
    rooms.reduce((map, room) => map.set(room.floor, [...(map.get(room.floor) ?? []), room]), new Map<number, IRoom[]>()),
  ).sort(([a], [b]) => a - b);

  const initialLoad = loading && rooms.length === 0;

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Rooms"
        description="Every room by floor. Set its category, floor and maintenance notes here."
        actions={
          <button type="button" className="btn-primary" onClick={openCreate}>
            <PlusIcon size={16} weight="regular" aria-hidden />
            Add room
          </button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <FilterPills
          options={STATUS_OPTIONS}
          value={filterStatus}
          onChange={setFilterStatus}
          layoutId="rooms-status"
          aria-label="Filter rooms by status"
          className="min-w-0"
        />
        {!initialLoad && !error && (
          <p className="shrink-0 text-xs text-zinc-500">
            <span className="font-mono tabular-nums text-zinc-900">{rooms.length}</span>{' '}
            {rooms.length === 1 ? 'room' : 'rooms'}
          </p>
        )}
      </div>

      {initialLoad ? (
        <div role="status" aria-label="Loading rooms" className="space-y-3">
          <Skeleton className="h-3 w-16 rounded-full" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-[13.5rem] rounded-[2rem]" />
            ))}
          </div>
        </div>
      ) : error ? (
        <ErrorState title="Couldn't load rooms" onRetry={load} />
      ) : rooms.length === 0 ? (
        <Panel variants={riseItem} initial="hidden" animate="show">
          {filterStatus ? (
            <EmptyState
              icon={FunnelSimpleIcon}
              title="No rooms with this status"
              description={`None are marked “${humanize(filterStatus)}” right now. Switch the filter back to All to see every room.`}
              action={
                <button type="button" className="btn-secondary" onClick={() => setFilterStatus('')}>
                  Show all rooms
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={BedIcon}
              title="No rooms yet"
              description="Add a room and assign it a stay category so it can be booked."
              action={
                <button type="button" className="btn-primary" onClick={openCreate}>
                  <PlusIcon size={16} weight="regular" aria-hidden />
                  Add room
                </button>
              }
            />
          )}
        </Panel>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          aria-busy={loading}
          className={clsx('space-y-8 transition-opacity duration-300', loading && 'opacity-60')}
        >
          {floors.map(([floor, list]) => (
            <motion.div key={floor} variants={stagger} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="eyebrow">
                  Floor <span className="font-mono">{floor}</span>
                </h2>
                <span aria-hidden className="h-px flex-1 bg-zinc-200/70" />
                <span className="font-mono text-xs tabular-nums text-zinc-400">
                  {list.length} {list.length === 1 ? 'room' : 'rooms'}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {list.map((room) => {
                  const status = STATUS_TONE[room.status];
                  return (
                    <Panel key={room.id} variants={riseItem} flush bodyClassName="gap-5 p-6">
                      <div className="flex items-start justify-between gap-3">
                        <p className="flex items-center gap-2 pt-2 text-xs font-medium text-zinc-600">
                          <StatusDot tone={status.tone} pulse={status.pulse} />
                          {humanize(room.status)}
                        </p>
                        <div className="-mr-2 -mt-0.5 flex items-center">
                          <button
                            type="button"
                            className="btn-icon"
                            aria-label={`Edit room ${room.roomNumber}`}
                            onClick={() => openEdit(room)}
                          >
                            <PencilSimpleIcon size={16} weight="regular" />
                          </button>
                          <button
                            type="button"
                            className="btn-icon hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Delete room ${room.roomNumber}`}
                            onClick={() => handleDelete(room)}
                          >
                            <TrashIcon size={16} weight="regular" />
                          </button>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-mono text-3xl font-medium leading-none tracking-tight text-zinc-950">
                          <span className="sr-only">Room </span>
                          {room.roomNumber}
                        </h3>
                        <p className="mt-2 truncate text-sm text-zinc-600">{room.category?.name ?? '—'}</p>
                      </div>

                      {room.maintenanceNotes && (
                        <p className="flex items-start gap-1.5 text-xs leading-relaxed text-zinc-500">
                          <WrenchIcon size={14} weight="regular" aria-hidden className="mt-0.5 shrink-0 text-zinc-400" />
                          <span className="line-clamp-2">{room.maintenanceNotes}</span>
                        </p>
                      )}

                      <div className="mt-auto flex items-baseline justify-between gap-3 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
                        <span>
                          Floor <span className="font-mono tabular-nums text-zinc-700">{room.floor}</span>
                        </span>
                        <span>
                          <span className="font-mono text-sm font-medium tabular-nums text-zinc-900">
                            ${Number(room.category?.basePrice ?? 0).toFixed(0)}
                          </span>
                          /night
                        </span>
                      </div>
                    </Panel>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Edit room ${editing.roomNumber}` : 'Add room'}
        description={editing ? undefined : "The room number can't be changed later."}
      >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <ModalBody>
            <div className="grid gap-4">
              {!editing && (
                <div className="grid gap-2">
                  <label htmlFor="room-number" className="text-sm font-medium text-zinc-700">
                    Room number
                  </label>
                  <input
                    id="room-number"
                    className="input font-mono"
                    value={form.roomNumber}
                    onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                    placeholder="e.g. 305"
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
                <div className="grid gap-2">
                  <label htmlFor="room-category" className="text-sm font-medium text-zinc-700">
                    Category
                  </label>
                  <select
                    id="room-category"
                    className="input"
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="room-floor" className="text-sm font-medium text-zinc-700">
                    Floor
                  </label>
                  <input
                    id="room-floor"
                    className="input font-mono tabular-nums"
                    type="number"
                    min={1}
                    value={form.floor}
                    onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label htmlFor="room-notes" className="text-sm font-medium text-zinc-700">
                  Maintenance notes
                </label>
                <textarea
                  id="room-notes"
                  className="input"
                  rows={2}
                  value={form.maintenanceNotes}
                  onChange={(e) => setForm({ ...form, maintenanceNotes: e.target.value })}
                  placeholder="Optional"
                />
                <p className="text-xs text-zinc-500">Shown on the room card. Leave empty if there's nothing to flag.</p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create room'}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete room ${deleteTarget?.roomNumber ?? ''}?`}
        description="This permanently removes the room from your inventory."
        confirmLabel="Delete room"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
