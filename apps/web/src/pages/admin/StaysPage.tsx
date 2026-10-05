import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { IRoomCategory, RoomType } from '@shared/index';

/**
 * Stays / Pricing — admin management of room categories. These are what the
 * public landing (cestlastay.com) shows as "stays": editing a category's name,
 * description, or price here flows through to the guest site (it matches a stay
 * card to a category by name via GET /rooms/categories).
 */

interface CategoryForm {
  name: string;
  type: RoomType;
  description: string;
  basePrice: number;
  maxOccupancy: number;
  amenities: string; // comma-separated in the form
  images: string; // comma-separated in the form
}

const EMPTY: CategoryForm = {
  name: '',
  type: RoomType.DOUBLE,
  description: '',
  basePrice: 0,
  maxOccupancy: 2,
  amenities: '',
  images: '',
};

const toList = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export default function AdminStaysPage() {
  const [categories, setCategories] = useState<IRoomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<IRoomCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/rooms/categories');
      setCategories(data);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(cat: IRoomCategory) {
    setEditing(cat);
    setForm({
      name: cat.name,
      type: cat.type,
      description: cat.description ?? '',
      basePrice: Number(cat.basePrice) || 0,
      maxOccupancy: cat.maxOccupancy,
      amenities: (cat.amenities ?? []).join(', '),
      images: (cat.images ?? []).join(', '),
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || undefined,
      basePrice: Number(form.basePrice),
      maxOccupancy: Number(form.maxOccupancy),
      amenities: toList(form.amenities),
      images: toList(form.images),
    };
    try {
      if (editing) {
        await api.patch(`/rooms/categories/${editing.id}`, payload);
        toast.success('Stay updated');
      } else {
        await api.post('/rooms/categories', payload);
        toast.success('Stay created');
      }
      setShowModal(false);
      load();
    } catch {
      // errors shown by interceptor
    }
  }

  async function handleDelete(cat: IRoomCategory) {
    if (!confirm(`Delete stay "${cat.name}"? (only possible if no rooms use it)`)) return;
    try {
      await api.delete(`/rooms/categories/${cat.id}`);
      toast.success('Stay deleted');
      load();
    } catch {
      // errors shown by interceptor (409 if rooms still reference it)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Stays &amp; Pricing</h2>
          <p className="text-gray-500 text-sm mt-1">
            {categories.length} stays · shown on cestlastay.com
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Add Stay</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                  <span className="badge badge-gray mt-1">{cat.type}</span>
                </div>
                <span className="font-semibold text-gray-800 whitespace-nowrap">
                  ₹{Number(cat.basePrice).toLocaleString('en-IN')}
                  <span className="text-gray-400 text-xs"> /night</span>
                </span>
              </div>
              {cat.description && (
                <p className="text-sm text-gray-600 line-clamp-3">{cat.description}</p>
              )}
              <p className="text-xs text-gray-400">Max occupancy: {cat.maxOccupancy}</p>
              <div className="flex gap-2 pt-1">
                <button className="btn-secondary text-xs py-1 px-2 flex-1" onClick={() => openEdit(cat)}>
                  Edit
                </button>
                <button className="btn-danger text-xs py-1 px-2 flex-1" onClick={() => handleDelete(cat)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {categories.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400 card">No stays yet.</div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold">{editing ? 'Edit Stay' : 'Add Stay'}</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Banyan Suite"
              />
              <p className="text-xs text-gray-400 mt-1">
                Must match the stay name on the landing page for live pricing to apply.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price / night (₹)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max occupancy</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={form.maxOccupancy}
                  onChange={(e) => setForm({ ...form, maxOccupancy: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as RoomType })}
              >
                {Object.values(RoomType).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="input"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="A treetop room beneath century-old branches, with an open-air bath."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amenities</label>
              <input
                className="input"
                value={form.amenities}
                onChange={(e) => setForm({ ...form, amenities: e.target.value })}
                placeholder="WiFi, AC, Open-air bath (comma separated)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URLs</label>
              <input
                className="input"
                value={form.images}
                onChange={(e) => setForm({ ...form, images: e.target.value })}
                placeholder="/banyan.png, ... (comma separated)"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1" onClick={handleSave}>
                {editing ? 'Save Changes' : 'Create Stay'}
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
