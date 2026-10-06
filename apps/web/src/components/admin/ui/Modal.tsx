import { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { snappy } from './motion';

const SIZE = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
} as const;

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: keyof typeof SIZE;
  /** Use <ModalBody> and <ModalFooter> inside — they can sit within a <form>. */
  children: ReactNode;
  className?: string;
}

/**
 * Dialog for the admin console. Portals into #admin-overlay-root (inside
 * .admin-shell, so admin styles apply; outside any transformed ancestor, so
 * `fixed` is relative to the viewport). Esc / backdrop close, focus is moved
 * in, trapped, and restored on close; body scroll is locked while open.
 */
export function Modal({ open, onClose, title, description, size = 'md', children, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      // An explicit [data-autofocus] wins; otherwise the first field/button in the
      // body, skipping the header's Close button.
      const preferred =
        panel.querySelector<HTMLElement>('[data-autofocus]') ??
        Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).find((el) => !el.closest('header'));
      (preferred ?? panel).focus();
    }, 30);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  const target = typeof document !== 'undefined'
    ? document.getElementById('admin-overlay-root') ?? document.body
    : null;
  if (!target) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={snappy}
            className={clsx(
              'relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-[1.75rem] border border-zinc-200/70 bg-white',
              'shadow-[inset_0_1px_0_rgb(255_255_255/0.8),0_32px_64px_-24px_rgb(24_24_27/0.35)] focus:outline-none',
              SIZE[size],
              className,
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 pb-4 pt-5">
              <div className="min-w-0">
                <h2 id={titleId} className="text-base font-semibold tracking-tight text-zinc-950">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-sm leading-relaxed text-zinc-500">
                    {description}
                  </p>
                )}
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="btn-icon -mr-2 -mt-1">
                <XIcon size={18} weight="regular" />
              </button>
            </header>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    target,
  );
}

/** Scrollable, padded body. Fields inside should use `grid gap-4`, each field `grid gap-2`. */
export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('min-h-0 flex-1 overflow-y-auto px-6 py-5', className)}>{children}</div>;
}

/** Sticky action row. Primary action last (right). */
export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-4', className)}>
      {children}
    </div>
  );
}
