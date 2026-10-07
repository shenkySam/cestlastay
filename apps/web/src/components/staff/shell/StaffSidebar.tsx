import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRightIcon, SignOutIcon, SquaresFourIcon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { UserRole } from '@shared/index';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/admin/ui';
import { NAV_FOCUS, SidebarNav } from '@/components/admin/shell/AdminSidebar';
import { STAFF_HOME, STAFF_NAV } from './nav';

interface StaffSidebarProps {
  animatePill?: boolean;
  headerAction?: ReactNode;
  onNavigate?: () => void;
  className?: string;
}

/** Front desk navigation: the admin sidebar's structure, one tier down. */
export function StaffSidebar({ animatePill = true, headerAction, onNavigate, className }: StaffSidebarProps) {
  const { user, logout } = useAuth();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <div className={clsx('flex h-full flex-col', className)}>
      <div className="flex h-16 shrink-0 items-center gap-2 px-6">
        <Link to={STAFF_HOME} onClick={onNavigate} className={clsx('flex min-w-0 flex-1 items-center gap-3 rounded-2xl', NAV_FOCUS)}>
          <img src="/logo.png" alt="" className="h-9 w-auto shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight tracking-tight text-zinc-950">
              C&apos;est La Stay
            </span>
            <span className="mt-0.5 flex items-center gap-1.5">
              <span className="eyebrow leading-none">Front desk</span>
              <span className="rounded-full bg-lagoon-100/70 px-1.5 py-px text-[10px] font-medium leading-4 text-lagoon-700 ring-1 ring-inset ring-lagoon-600/15">
                {isAdmin ? 'Admin' : 'Staff'}
              </span>
            </span>
          </span>
        </Link>
        {headerAction}
      </div>

      <SidebarNav nav={STAFF_NAV} home={STAFF_HOME} label="Front desk" animatePill={animatePill} onNavigate={onNavigate} />

      {isAdmin && (
        <div className="shrink-0 px-3 pb-3">
          <Link
            to="/admin"
            onClick={onNavigate}
            className={clsx(
              'group flex items-center gap-3 rounded-2xl border border-zinc-200/70 bg-white/60 px-3 py-2.5',
              'transition-colors duration-200 hover:border-zinc-300 hover:bg-white',
              NAV_FOCUS,
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-lagoon-50 text-lagoon-700 ring-1 ring-inset ring-lagoon-600/15">
              <SquaresFourIcon size={16} weight="regular" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium leading-tight text-zinc-900">Admin console</span>
              <span className="mt-0.5 block truncate text-xs text-zinc-500">Back to the admin view</span>
            </span>
            <ArrowUpRightIcon
              size={16}
              weight="regular"
              className="shrink-0 text-zinc-400 transition-[color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-zinc-700"
            />
          </Link>
        </div>
      )}

      <div className="shrink-0 border-t border-zinc-200/60 px-3 py-3">
        <div className="flex items-center gap-3 px-3">
          <Avatar firstName={user?.firstName} lastName={user?.lastName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight text-zinc-900">{fullName || 'Front desk'}</p>
            {user?.email && <p className="mt-0.5 truncate text-xs text-zinc-500">{user.email}</p>}
          </div>
          <button type="button" onClick={logout} aria-label="Sign out" title="Sign out" className="btn-icon -mr-1 shrink-0">
            <SignOutIcon size={18} weight="regular" />
          </button>
        </div>
      </div>
    </div>
  );
}
