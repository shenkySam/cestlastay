import { ReactNode, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useDialogFocus } from '@/lib/useDialogFocus';
import { snappy } from '@/components/admin/ui/motion';

const SIZE = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
} as const;

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: keyof typeof SIZE;
  /** Use <SheetBody> and <SheetFooter> inside; they can sit within a <form>. */
  children: ReactNode;
}

/**
 * Guest portal dialog: a bottom sheet on phones, a centred card from `sm` up.
 * Portals into #guest-overlay-root (inside .guest-shell, so portal styles
 * apply). Esc and the backdrop close it; focus is moved in, trapped and
 * restored, and page scroll is locked while open.
 */
export function Sheet({ open, onClose, title, description, size = 'md', children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useDialogFocus(open, panelRef, onClose);

  const target = typeof document !== 'undefined'
    ? document.getElementById('guest-overlay-root') ?? document.body
    : null;
  if (!target) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center font-jost text-guest-ink sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-guest-scrim/50 backdrop-blur-[2px]"
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
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={snappy}
            className={clsx(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-guest-ink/10',
              'bg-guest-surface shadow-[inset_0_1px_0_rgb(var(--g-raised)),0_-24px_60px_-30px_rgb(var(--g-scrim)/0.5)]',
              'focus:outline-none sm:rounded-[1.75rem]',
              SIZE[size],
            )}
          >
            <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-guest-ink/15 sm:hidden" />
            <header className="flex items-start justify-between gap-4 px-6 pb-1 pt-4 sm:pt-6">
              <div className="min-w-0">
                <h2 id={titleId} className="font-cormorant text-[1.75rem] font-semibold leading-tight">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-sm leading-relaxed text-guest-muted">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-guest-muted transition-colors
                           hover:bg-guest-ink/[0.06] hover:text-guest-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-guest-clay/50"
              >
                <XIcon size={20} />
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

/** Scrollable, padded body. Fields inside: `grid gap-6`, each field `grid gap-2`. */
export function SheetBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4', className)}>{children}</div>;
}

/** Action row; buttons share the width on phones. Primary action last (right). */
export function SheetFooter({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex items-center gap-3 border-t border-guest-ink/[0.07] px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]
                 [&>*]:flex-1 sm:justify-end sm:pb-5 sm:[&>*]:flex-none"
    >
      {children}
    </div>
  );
}
