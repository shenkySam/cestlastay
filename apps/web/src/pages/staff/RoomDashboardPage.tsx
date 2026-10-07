import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { BedIcon, FunnelSimpleIcon } from '@phosphor-icons/react';
import { useSocket } from '@/contexts/SocketContext';
import { IRoom, RoomStatus } from '@shared/index';
import {
  EmptyState,
  FilterPills,
  PageHeader,
  Panel,
  ROOM_STATUS_TONE,
  Skeleton,
  StatusDot,
  humanize,
  riseItem,
  stagger,
} from '@/components/admin/ui';
import type { SegmentOption } from '@/components/admin/ui';

export default function StaffRoomDashboardPage() {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RoomStatus | ''>('');

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onRoomStatus = (updatedRoom: IRoom) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)),
      );
    };
    socket.on('room:status-changed', onRoomStatus);
    return () => { socket.off('room:status-changed', onRoomStatus); };
  }, [socket]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/rooms');
      setRooms(data);
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(room: IRoom, status: RoomStatus) {
    setUpdatingId(room.id);
    try {
      await api.patch(`/rooms/${room.id}/status`, { status });
      toast.success(`Room ${room.roomNumber} → ${humanize(status)}`);
    } catch {
      // errors shown by interceptor
    } finally {
      setUpdatingId(null);
    }
  }

  const options: SegmentOption<RoomStatus | ''>[] = [
    { value: '', label: 'All', count: rooms.length },
    ...Object.values(RoomStatus).map((s) => ({
      value: s,
      label: (
        <>
          <StatusDot tone={ROOM_STATUS_TONE[s].tone} pulse={false} />
          {humanize(s)}
        </>
      ),
      count: rooms.filter((r) => r.status === s).length,
    })),
  ];

  const visible = filter ? rooms.filter((r) => r.status === filter) : rooms;

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Today"
        title="Room board"
        description="Live occupancy. Changes made here or anywhere else appear instantly."
      />

      <FilterPills
        options={options}
        value={filter}
        onChange={setFilter}
        layoutId="room-board-status"
        aria-label="Filter rooms by status"
      />

      {loading ? (
        <div role="status" aria-label="Loading rooms" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-[2rem]" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Panel>
          {filter ? (
            <EmptyState
              icon={FunnelSimpleIcon}
              title="No rooms with this status"
              description={`None are marked “${humanize(filter)}” right now.`}
              action={
                <button type="button" className="btn-secondary" onClick={() => setFilter('')}>
                  Show all rooms
                </button>
              }
            />
          ) : (
            <EmptyState icon={BedIcon} title="No rooms yet" description="An admin adds rooms from the admin console." />
          )}
        </Panel>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {visible.map((room) => {
            const status = ROOM_STATUS_TONE[room.status];
            const busy = updatingId === room.id;
            return (
              <Panel
                key={room.id}
                variants={riseItem}
                flush
                bodyClassName="gap-4 p-6"
                className={clsx('transition-opacity duration-300', busy && 'opacity-60')}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-mono text-3xl font-medium leading-none tracking-tight text-zinc-950">
                    <span className="sr-only">Room </span>
                    {room.roomNumber}
                  </h3>
                  <p className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                    <StatusDot tone={status.tone} pulse={status.pulse} />
                    {humanize(room.status)}
                  </p>
                </div>

                <p className="truncate text-sm text-zinc-600">
                  {room.category?.name ?? '—'}
                  <span className="text-zinc-400"> · Floor </span>
                  <span className="font-mono tabular-nums text-zinc-700">{room.floor}</span>
                </p>

                <label className="mt-auto block border-t border-zinc-100 pt-4">
                  <span className="sr-only">Set status for room {room.roomNumber}</span>
                  <select
                    className="input py-2 text-xs"
                    value={room.status}
                    disabled={busy}
                    onChange={(e) => changeStatus(room, e.target.value as RoomStatus)}
                  >
                    {Object.values(RoomStatus).map((s) => (
                      <option key={s} value={s}>{humanize(s)}</option>
                    ))}
                  </select>
                </label>
              </Panel>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
