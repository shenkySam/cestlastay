import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSocket } from '@/contexts/SocketContext';
import { IRoom, RoomStatus } from '@shared/index';

const STATUS_BADGE: Record<RoomStatus, string> = {
  [RoomStatus.AVAILABLE]: 'badge-green',
  [RoomStatus.OCCUPIED]: 'badge-red',
  [RoomStatus.RESERVED]: 'badge-blue',
  [RoomStatus.CLEANING]: 'badge-yellow',
  [RoomStatus.MAINTENANCE]: 'badge-gray',
  [RoomStatus.OUT_OF_ORDER]: 'badge-red',
};

const STATUS_COLORS: Record<RoomStatus, string> = {
  [RoomStatus.AVAILABLE]: 'border-green-300 bg-green-50',
  [RoomStatus.OCCUPIED]: 'border-red-300 bg-red-50',
  [RoomStatus.RESERVED]: 'border-blue-300 bg-blue-50',
  [RoomStatus.CLEANING]: 'border-yellow-300 bg-yellow-50',
  [RoomStatus.MAINTENANCE]: 'border-gray-300 bg-gray-50',
  [RoomStatus.OUT_OF_ORDER]: 'border-red-400 bg-red-100',
};

export default function StaffRoomDashboardPage() {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('room:status-changed', (updatedRoom: IRoom) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)),
      );
    });
    return () => { socket.off('room:status-changed'); };
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
      toast.success(`Room ${room.roomNumber} → ${status}`);
    } catch {
      // errors shown by interceptor
    } finally {
      setUpdatingId(null);
    }
  }

  const counts = Object.values(RoomStatus).map((s) => ({
    status: s,
    count: rooms.filter((r) => r.status === s).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Room Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">
          Live occupancy status — updates in real-time
        </p>
      </div>

      {/* Summary strip */}
      <div className="flex gap-3 flex-wrap">
        {counts.map(({ status, count }) => (
          <div key={status} className={`card px-4 py-2 flex items-center gap-2 border-2 ${STATUS_COLORS[status]}`}>
            <span className={`badge ${STATUS_BADGE[status]}`}>{status}</span>
            <span className="font-bold text-gray-900">{count}</span>
          </div>
        ))}
      </div>

      {/* Room grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading rooms...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`rounded-xl border-2 p-3 space-y-2 transition-all ${STATUS_COLORS[room.status]} ${updatingId === room.id ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">#{room.roomNumber}</span>
                <span className={`badge text-xs ${STATUS_BADGE[room.status]}`}>{room.status}</span>
              </div>
              <p className="text-xs text-gray-600">{room.category?.name}</p>
              <p className="text-xs text-gray-400">Floor {room.floor}</p>

              {/* Quick-change status */}
              <select
                className="w-full text-xs border border-gray-300 rounded-md px-1 py-1 bg-white"
                value={room.status}
                disabled={updatingId === room.id}
                onChange={(e) => changeStatus(room, e.target.value as RoomStatus)}
              >
                {Object.values(RoomStatus).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
