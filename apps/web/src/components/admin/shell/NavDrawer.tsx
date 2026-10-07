import { ComponentType, ReactNode, useEffect, useRef } from 'react';
import { AnimatePresence, LayoutGroup, motion, useIsPresent, type Transition } from 'framer-motion';
import { XIcon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useScrollLock } from './hooks';

/** Critically damped: a drawer that overshoots shows a gap at the screen edge. */
const slide: Transition = { type: 'spring', stiffness: 300, damping: 36 };

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface DrawerSidebarProps {
  animatePill?: boolean;
  headerAction?: ReactNode;
  onNavigate?: () => void;
}

interface NavDrawerProps {
  open: boolean;
  /** AdminSidebar or StaffSidebar */
  sidebar: ComponentType<DrawerSidebarProps>;
  /** Esc, scrim or the close button: close and hand focus back to the menu button */
  onClose: () => void;
  /** A link was followed: close without moving focus */
  onNavigate: () => void;
}

/** Below lg the sidebar slides in from the left over a scrim. */
export function NavDrawer({ open, sidebar, onClose, onNavigate }: NavDrawerProps) {
  useScrollLock(open);

  return <AnimatePresence>{open && <DrawerPanel key="drawer" sidebar={sidebar} onClose={onClose} onNavigate={onNavigate} />}</AnimatePresence>;
}

function DrawerPanel({ sidebar: Sidebar, onClose, onNavigate }: Omit<NavDrawerProps, 'open'>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const isPresent = useIsPresent();

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });

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
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={clsx('fixed inset-0 z-50 lg:hidden', !isPresent && 'pointer-events-none')}>
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-zinc-950/40"
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
        aria-label="Navigation"
        className="absolute inset-y-0 left-0 w-[min(300px,86vw)] border-r border-zinc-200/60 bg-[var(--shell-canvas)] shadow-[0_32px_64px_-24px_rgb(24_24_27/0.35)]"
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={slide}
      >
        <LayoutGroup id="nav-drawer">
          <Sidebar
            animatePill={false}
            onNavigate={onNavigate}
            headerAction={
              <button ref={closeRef} type="button" onClick={onClose} aria-label="Close navigation" className="btn-icon -mr-2 shrink-0">
                <XIcon size={18} weight="regular" />
              </button>
            }
          />
        </LayoutGroup>
      </motion.div>
    </div>
  );
}
