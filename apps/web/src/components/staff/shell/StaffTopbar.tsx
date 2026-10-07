import { RefObject } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ListIcon } from '@phosphor-icons/react';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { snappy } from '@/components/admin/ui';
import { LiveIndicator, NOTIFICATIONS_SKIN } from '@/components/admin/shell/AdminTopbar';
import { staffPageTitle } from './nav';

interface StaffTopbarProps {
  onOpenNav: () => void;
  menuButtonRef: RefObject<HTMLButtonElement>;
}

export function StaffTopbar({ onOpenNav, menuButtonRef }: StaffTopbarProps) {
  const { pathname } = useLocation();
  const title = staffPageTitle(pathname);

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
          <p className="eyebrow leading-none">Front desk</p>
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

        <LiveIndicator />
        <div className={NOTIFICATIONS_SKIN}>
          <NotificationDropdown />
        </div>
      </div>
    </header>
  );
}
