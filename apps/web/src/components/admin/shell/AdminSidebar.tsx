import { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRightIcon, CallBellIcon, SignOutIcon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, snappy } from '@/components/admin/ui';
import { ADMIN_HOME, ADMIN_NAV, AdminNavItem } from './nav';

const PILL =
  'absolute inset-0 rounded-full bg-white ring-1 ring-zinc-200/70 shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_1px_2px_rgb(24_24_27/0.05),0_8px_20px_-12px_rgb(24_24_27/0.18)]';

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-lagoon-500/40';

interface AdminSidebarProps {
  /**
   * Spring the active pill between items. The desktop rail wants it; the
   * mobile drawer closes on navigation, so its pill never needs to travel.
   */
  animatePill?: boolean;
  /** Sits beside the brand, e.g. the drawer's close button */
  headerAction?: ReactNode;
  /** Called on any link click, including the current page (the drawer closes on it) */
  onNavigate?: () => void;
  className?: string;
}

/**
 * Admin navigation column: brand, grouped links, the front desk shortcut and
 * the signed-in user. Mount each instance inside its own <LayoutGroup id> so
 * the desktop rail and the drawer never share a pill.
 */
export function AdminSidebar({ animatePill = true, headerAction, onNavigate, className }: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <div className={clsx('flex h-full flex-col', className)}>
      <div className="flex h-16 shrink-0 items-center gap-2 px-6">
        <Link to={ADMIN_HOME} onClick={onNavigate} className={clsx('flex min-w-0 flex-1 items-center gap-3 rounded-2xl', FOCUS)}>
          <img src="/logo.png" alt="" className="h-9 w-auto shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight tracking-tight text-zinc-950">
              C&apos;est La Stay
            </span>
            <span className="eyebrow mt-0.5 block leading-none">Admin console</span>
          </span>
        </Link>
        {headerAction}
      </div>

      <motion.nav layoutScroll aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-5 pt-4">
        <div className="space-y-6">
          {ADMIN_NAV.map((group) => (
            <div key={group.label}>
              <p className="eyebrow px-3 pb-2">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <SidebarLink item={item} animatePill={animatePill} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </motion.nav>

      <div className="shrink-0 px-3 pb-3">
        <Link
          to="/staff"
          onClick={onNavigate}
          className={clsx(
            'group flex items-center gap-3 rounded-2xl border border-zinc-200/70 bg-white/60 px-3 py-2.5',
            'transition-colors duration-200 hover:border-zinc-300 hover:bg-white',
            FOCUS,
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-lagoon-50 text-lagoon-700 ring-1 ring-inset ring-lagoon-600/15">
            <CallBellIcon size={16} weight="regular" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium leading-tight text-zinc-900">Front desk</span>
            <span className="mt-0.5 block truncate text-xs text-zinc-500">Open the front desk view</span>
          </span>
          <ArrowUpRightIcon
            size={16}
            weight="regular"
            className="shrink-0 text-zinc-400 transition-[color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-zinc-700"
          />
        </Link>
      </div>

      <div className="shrink-0 border-t border-zinc-200/60 px-3 py-3">
        <div className="flex items-center gap-3 px-3">
          <Avatar firstName={user?.firstName} lastName={user?.lastName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight text-zinc-900">{fullName || 'Administrator'}</p>
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

interface SidebarLinkProps {
  item: AdminNavItem;
  animatePill: boolean;
  onNavigate?: () => void;
}

function SidebarLink({ item, animatePill, onNavigate }: SidebarLinkProps) {
  const IconCmp = item.icon;
  return (
    <NavLink
      to={item.href}
      end={item.href === ADMIN_HOME}
      onClick={onNavigate}
      className={({ isActive }) =>
        clsx(
          'group relative flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200',
          FOCUS,
          isActive ? 'text-zinc-950' : 'text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive &&
            (animatePill ? (
              <motion.span layoutId="admin-nav-pill" transition={snappy} className={PILL} />
            ) : (
              <span className={PILL} />
            ))}
          <IconCmp
            size={18}
            weight={isActive ? 'fill' : 'regular'}
            className={clsx(
              'relative shrink-0 transition-colors duration-200',
              isActive ? 'text-lagoon-600' : 'text-zinc-500 group-hover:text-zinc-900',
            )}
          />
          <span className="relative truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
