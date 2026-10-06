import { RefObject } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ListIcon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useSocket } from '@/contexts/SocketContext';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { StatusDot, snappy } from '@/components/admin/ui';
import { adminPageTitle } from './nav';
import { CommandPalette } from './CommandPalette';

/**
 * NotificationDropdown is shared with the staff portal and stays untouched;
 * these wrapper-scoped variants only bring its bell and panel onto the
 * console's zinc/lagoon tokens. If its markup changes they simply stop matching.
 */
const NOTIFICATIONS_SKIN = clsx(
  '[&>div>button]:rounded-full [&>div>button]:text-zinc-500',
  '[&>div>button:hover]:bg-zinc-100 [&>div>button:hover]:text-zinc-900',
  '[&>div>button>span]:bg-lagoon-600 [&>div>button>span]:font-mono [&>div>button>span]:tabular-nums',
  '[&>div>div]:rounded-2xl [&>div>div]:border-zinc-200/70 [&>div>div]:shadow-diffuse-lg',
);

interface AdminTopbarProps {
  onOpenNav: () => void;
  menuButtonRef: RefObject<HTMLButtonElement>;
}

export function AdminTopbar({ onOpenNav, menuButtonRef }: AdminTopbarProps) {
  const { pathname } = useLocation();
  const title = adminPageTitle(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/60 bg-white/70 shadow-[inset_0_-1px_0_rgb(255_255_255/0.6)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-2 px-4 md:gap-3 md:px-8">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="btn-icon -ml-2 shrink-0 lg:hidden"
        >
          <ListIcon size={20} weight="regular" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="eyebrow leading-none">Admin</p>
          <motion.p
            key={title}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={snappy}
            className="mt-1 truncate text-sm font-semibold leading-tight tracking-tight text-zinc-950"
          >
            {title}
          </motion.p>
        </div>

        <CommandPalette />
        <LiveIndicator />
        <div className={NOTIFICATIONS_SKIN}>
          <NotificationDropdown />
        </div>
      </div>
    </header>
  );
}

function LiveIndicator() {
  const { socket, connected } = useSocket();
  const live = connected || Boolean(socket?.connected);

  return (
    <span
      role="status"
      title={live ? 'Receiving live updates' : 'Live updates paused. Data refreshes when you reload.'}
      className="hidden shrink-0 items-center gap-2 px-1.5 text-xs font-medium text-zinc-500 sm:inline-flex"
    >
      <StatusDot tone={live ? 'emerald' : 'zinc'} pulse={live} />
      {live ? 'Live' : 'Offline'}
    </span>
  );
}
