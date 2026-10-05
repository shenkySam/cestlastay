import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { IRoom, IRoomCategory, RoomStatus, RoomType } from '@shared/index';

const STATUS_BADGE: Record<RoomStatus, string> = {
  [RoomStatus.AVAILABLE]: 'badge-green',
  [RoomStatus.OCCUPIED]: 'badge-red',
  [RoomStatus.RESERVED]: 'badge-blue',
  [RoomStatus.CLEANING]: 'badge-yellow',
  [RoomStatus.MAINTENANCE]: 'badge-gray',
  [RoomStatus.OUT_OF_ORDER]: 'badge-red',
};

const EMPTY_ROOM = { roomNumber: '', categoryId: '', floor: 1, maintenanceNotes: '' };

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [categories, setCategories] = useState<IRoomCategory[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<IRoom | null>(null);
  const [form, setForm] = useState(EMPTY_ROOM);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [filterStatus]);

  async function load() {
    setLoading(true);
    try {
      const [roomsRes, catsRes] = await Promise.all([
        api.get('/rooms', { params: filterStatus ? { status: filterStatus } : {} }),
        api.get('/rooms/categories'),
      ]);
      setRooms(roomsRes.data);
      setCategories(catsRes.data);
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
    }
  }

  async function handleDelete(room: IRoom) {
    if (!confirm(`Delete room ${room.roomNumber}?`)) return;
    try {
      await api.delete(`/rooms/${room.id}`);
      toast.success('Room deleted');
      load();
    } catch {
      // errors shown by interceptor
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Room Management</h2>
          <p className="text-gray-500 text-sm mt-1">{rooms.length} rooms total</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Add Room</button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', ...Object.values(RoomStatus)].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
              filterStatus === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Room grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">#{room.roomNumber}</span>
                <span className={`badge ${STATUS_BADGE[room.status]}`}>{room.status}</span>
              </div>
              <div className="text-sm text-gray-600 space-y-0.5">
                <p>{room.category?.name}</p>
                <p className="text-gray-400">Floor {room.floor}</p>
                <p className="font-medium text-gray-800">
                  ${Number(room.category?.basePrice ?? 0).toFixed(0)}/night
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  className="btn-secondary text-xs py-1 px-2 flex-1"
                  onClick={() => openEdit(room)}
                >
                  Edit
                </button>
                <button
                  className="btn-danger text-xs py-1 px-2 flex-1"
                  onClick={() => handleDelete(room)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rooms.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400 card">No rooms found.</div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold">{editing ? 'Edit Room' : 'Add Room'}</h3>

            {!editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                <input
                  className="input"
                  value={form.roomNumber}
                  onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                  placeholder="e.g. 305"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
              <input
                className="input"
                type="number"
                min={1}
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Notes</label>
              <textarea
                className="input"
                rows={2}
                value={form.maintenanceNotes}
                onChange={(e) => setForm({ ...form, maintenanceNotes: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1" onClick={handleSave}>
                {editing ? 'Save Changes' : 'Create Room'}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
