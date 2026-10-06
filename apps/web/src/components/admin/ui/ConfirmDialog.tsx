import { ReactNode, useState } from 'react';
import { Modal, ModalBody, ModalFooter } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' for destructive actions (default) */
  tone?: 'danger' | 'default';
  /** May return a promise; the button shows a busy state until it settles */
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Replaces window.confirm(). Typical use:
 *   const [pending, setPending] = useState<Room | null>(null);
 *   <ConfirmDialog open={!!pending} onCancel={() => setPending(null)}
 *     onConfirm={async () => { await api.delete(...); setPending(null); load(); }} ... />
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={busy ? () => {} : onCancel} title={title} size="sm">
      {description && (
        <ModalBody>
          <p className="text-sm leading-relaxed text-zinc-600">{description}</p>
        </ModalBody>
      )}
      <ModalFooter>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          data-autofocus
          className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
          onClick={handleConfirm}
          disabled={busy}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </ModalFooter>
    </Modal>
  );
}
