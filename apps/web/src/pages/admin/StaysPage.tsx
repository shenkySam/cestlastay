import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { ImagesIcon, PencilSimpleIcon, PlusIcon, TagIcon, TrashIcon, UsersIcon } from '@phosphor-icons/react';
import api from '@/lib/api';
import { IRoomCategory, RoomType } from '@shared/index';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Modal,
  ModalBody,
  ModalFooter,
  PageHeader,
  Panel,
  Skeleton,
  humanize,
  riseItem,
  stagger,
} from '@/components/admin/ui';

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

/**
 * Zig-zag rhythm on xl (6 columns): wide + narrow, then narrow + wide.
 * Two columns on md, one below. A lone last card takes the full row.
 */
function cardLayout(i: number, total: number): { span: string; wide: boolean } {
  if (total % 2 === 1 && i === total - 1) return { span: 'md:col-span-2 xl:col-span-6', wide: true };
  const evenRow = Math.floor(i / 2) % 2 === 0;
  const first = i % 2 === 0;
  return evenRow === first ? { span: 'xl:col-span-4', wide: true } : { span: 'xl:col-span-2', wide: false };
}

const FIELD_LABEL = 'text-sm font-medium text-zinc-700';
const FIELD_HELP = 'text-xs text-zinc-500';

export default function AdminStaysPage() {
  const [categories, setCategories] = useState<IRoomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Enter now submits the form, so guard against a second request in flight
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<IRoomCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<IRoomCategory | null>(null);

  // Keeps the dialog title stable while it animates out after `pendingDelete` clears.
  const lastPending = useRef<IRoomCategory | null>(null);
  if (pendingDelete) lastPending.current = pendingDelete;
  const deleteTarget = pendingDelete ?? lastPending.current;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get('/rooms/categories');
      setCategories(data);
    } catch {
      setError(true);
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
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
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
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleSave();
  }

  function handleDelete(cat: IRoomCategory) {
    setPendingDelete(cat);
  }

  async function confirmDelete() {
    const cat = pendingDelete;
    if (!cat) return;
    try {
      await api.delete(`/rooms/categories/${cat.id}`);
      toast.success('Stay deleted');
      load();
    } catch {
      // errors shown by interceptor (409 if rooms still reference it)
    }
    setPendingDelete(null);
  }

  const initialLoad = loading && categories.length === 0;

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Stays & pricing"
        description={
          initialLoad || error ? (
            'Room categories, shown as stays on cestlastay.com.'
          ) : (
            <>
              <span className="font-mono tabular-nums text-zinc-700">{categories.length}</span>{' '}
              {categories.length === 1 ? 'stay' : 'stays'} · shown on cestlastay.com
            </>
          )
        }
        actions={
          <button type="button" className="btn-primary" onClick={openCreate}>
            <PlusIcon size={16} weight="regular" aria-hidden />
            Add stay
          </button>
        }
      />

      {initialLoad ? (
        <div role="status" aria-label="Loading stays" className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className={clsx('h-64 rounded-[2rem]', cardLayout(i, 4).span)} />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Couldn't load stays" onRetry={load} />
      ) : categories.length === 0 ? (
        <Panel variants={riseItem} initial="hidden" animate="show">
          <EmptyState
            icon={TagIcon}
            title="No stays yet"
            description="Stays are the room categories guests see on cestlastay.com. Add one, then assign rooms to it on the Rooms page."
            action={
              <button type="button" className="btn-primary" onClick={openCreate}>
                <PlusIcon size={16} weight="regular" aria-hidden />
                Add stay
              </button>
            }
          />
        </Panel>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          aria-busy={loading}
          className={clsx(
            'grid gap-4 transition-opacity duration-300 md:grid-cols-2 xl:grid-cols-6',
            loading && 'opacity-60',
          )}
        >
          {categories.map((cat, i) => {
            const { span, wide } = cardLayout(i, categories.length);
            const amenities = cat.amenities ?? [];
            const shownAmenities = amenities.slice(0, wide ? 8 : 4);
            const moreAmenities = amenities.length - shownAmenities.length;
            const imageCount = (cat.images ?? []).length;

            return (
              <Panel key={cat.id} variants={riseItem} className={span} bodyClassName="gap-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="badge badge-gray">{humanize(cat.type)}</span>
                    <h3 className="mt-3 text-base font-semibold tracking-tight text-zinc-950">{cat.name}</h3>
                  </div>
                  <p className="shrink-0 text-right">
                    <span
                      className={clsx(
                        'block font-mono font-medium leading-none tracking-tight tabular-nums text-zinc-950',
                        wide ? 'text-2xl' : 'text-xl',
                      )}
                    >
                      ₹{Number(cat.basePrice).toLocaleString('en-IN')}
                    </span>
                    <span className="mt-1.5 block text-xs text-zinc-400">per night</span>
                  </p>
                </div>

                {cat.description && (
                  <p className={clsx('line-clamp-3 text-sm leading-relaxed text-zinc-600', wide && 'max-w-[62ch]')}>
                    {cat.description}
                  </p>
                )}

                {shownAmenities.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5" aria-label="Amenities">
                    {shownAmenities.map((a, idx) => (
                      <li
                        key={`${a}-${idx}`}
                        className="rounded-full bg-zinc-50 px-2.5 py-1 text-xs text-zinc-600 ring-1 ring-inset ring-zinc-200/70"
                      >
                        {a}
                      </li>
                    ))}
                    {moreAmenities > 0 && (
                      <li className="rounded-full px-2 py-1 font-mono text-xs tabular-nums text-zinc-400">
                        +{moreAmenities}
                      </li>
                    )}
                  </ul>
                )}

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1.5">
                      <UsersIcon size={14} weight="regular" aria-hidden className="text-zinc-400" />
                      Max occupancy <span className="font-mono tabular-nums text-zinc-700">{cat.maxOccupancy}</span>
                    </span>
                    {imageCount > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <ImagesIcon size={14} weight="regular" aria-hidden className="text-zinc-400" />
                        <span className="font-mono tabular-nums text-zinc-700">{imageCount}</span>
                        {imageCount === 1 ? 'image' : 'images'}
                      </span>
                    )}
                  </div>
                  <div className="-mr-2 flex shrink-0 items-center">
                    <button
                      type="button"
                      className="btn-icon"
                      aria-label={`Edit stay ${cat.name}`}
                      onClick={() => openEdit(cat)}
                    >
                      <PencilSimpleIcon size={16} weight="regular" />
                    </button>
                    <button
                      type="button"
                      className="btn-icon hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Delete stay ${cat.name}`}
                      onClick={() => handleDelete(cat)}
                    >
                      <TrashIcon size={16} weight="regular" />
                    </button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </motion.div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit stay' : 'Add stay'}
        description="Name, description and price show on cestlastay.com."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <ModalBody>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="stay-name" className={FIELD_LABEL}>Name</label>
                <input
                  id="stay-name"
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Banyan Suite"
                />
                <p className={FIELD_HELP}>
                  Must match the stay name on the landing page for live pricing to apply.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="stay-price" className={FIELD_LABEL}>Price / night (₹)</label>
                  <input
                    id="stay-price"
                    className="input font-mono tabular-nums"
                    type="number"
                    min={0}
                    step="any"
                    value={form.basePrice}
                    onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="stay-occupancy" className={FIELD_LABEL}>Max occupancy</label>
                  <input
                    id="stay-occupancy"
                    className="input font-mono tabular-nums"
                    type="number"
                    min={1}
                    value={form.maxOccupancy}
                    onChange={(e) => setForm({ ...form, maxOccupancy: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label htmlFor="stay-type" className={FIELD_LABEL}>Type</label>
                <select
                  id="stay-type"
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as RoomType })}
                >
                  {Object.values(RoomType).map((t) => (
                    <option key={t} value={t}>{humanize(t)}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="stay-description" className={FIELD_LABEL}>Description</label>
                <textarea
                  id="stay-description"
                  className="input"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="A treetop room beneath century-old branches, with an open-air bath."
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="stay-amenities" className={FIELD_LABEL}>Amenities</label>
                <input
                  id="stay-amenities"
                  className="input"
                  value={form.amenities}
                  onChange={(e) => setForm({ ...form, amenities: e.target.value })}
                  placeholder="WiFi, AC, Open-air bath"
                />
                <p className={FIELD_HELP}>Comma separated.</p>
              </div>

              <div className="grid gap-2">
                <label htmlFor="stay-images" className={FIELD_LABEL}>Image URLs</label>
                <input
                  id="stay-images"
                  className="input font-mono"
                  value={form.images}
                  onChange={(e) => setForm({ ...form, images: e.target.value })}
                  placeholder="/banyan.png, ..."
                />
                <p className={FIELD_HELP}>Comma separated.</p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create stay'}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete “${deleteTarget?.name ?? ''}”?`}
        description="A stay can only be deleted when no rooms use it. Move those rooms to another category first."
        confirmLabel="Delete stay"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
