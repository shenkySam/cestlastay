import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutGroup, MotionConfig, motion } from 'framer-motion';
import { SignOutIcon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { GUEST_HOME, GuestNavItem, guestNav } from '@/components/guest/nav';
import { snappy } from '@/components/admin/ui/motion';

const FOCUS =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-guest-clay/50 focus-visible:ring-offset-2 focus-visible:ring-offset-guest-canvas';

const PILL = 'absolute inset-0 rounded-full bg-guest-raised ring-1 ring-guest-ink/[0.07] shadow-guest';

/**
 * Guest portal frame ("Earthen"): frosted top bar with the brand, a pill nav
 * from `md` up, and a floating tab bar on phones. Each nav has its own
 * LayoutGroup so the two active pills never trade places.
 */
export function GuestLayout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const nav = guestNav(user?.booking?.status === 'CONFIRMED');

  // Match the page canvas so overscroll never flashes the base sand colour
  useEffect(() => {
    const { body } = document;
    const previous = body.style.backgroundColor;
    body.style.backgroundColor = 'rgb(var(--g-canvas))';
    return () => {
      body.style.backgroundColor = previous;
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="guest-shell min-h-[100dvh]">
        <header className="guest-glass sticky top-0 z-30 border-b border-guest-ink/[0.07]">
          <div className="mx-auto grid h-16 max-w-5xl grid-cols-[1fr_auto] items-center gap-4 px-4 md:grid-cols-[1fr_auto_1fr] md:px-8">
            <Link to={GUEST_HOME} className={clsx('flex items-center gap-2.5 justify-self-start rounded-full pr-2', FOCUS)}>
              <picture>
                <source type="image/avif" srcSet="/login/logo-mark-480.avif" />
                <img
                  src="/login/logo-mark-480.webp"
                  alt=""
                  width={480}
                  height={336}
                  className="size-9 object-cover"
                />
              </picture>
              <span className="font-cormorant text-xl font-semibold tracking-wide">C’est La Stay</span>
            </Link>

            <nav aria-label="Guest" className="hidden md:block">
              <LayoutGroup id="guest-nav-bar">
                <ul className="flex items-center gap-1 rounded-full bg-guest-ink/[0.05] p-1 ring-1 ring-inset ring-guest-ink/[0.05]">
                  {nav.map((item) => (
                    <li key={item.href}>
                      <BarLink item={item} />
                    </li>
                  ))}
                </ul>
              </LayoutGroup>
            </nav>

            <button type="button" onClick={logout} className="btn-ghost justify-self-end">
              <SignOutIcon size={18} aria-hidden />
              Sign out
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-32 pt-6 md:px-8 md:pb-20 md:pt-10">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>

        <nav
          aria-label="Guest"
          className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
        >
          <LayoutGroup id="guest-nav-dock">
            <ul
              className="guest-glass mx-auto flex max-w-sm gap-1 rounded-full border border-guest-ink/10 p-1.5
                         shadow-[inset_0_1px_0_rgb(var(--g-raised)),0_18px_40px_-18px_rgb(var(--g-scrim)/0.45)]"
            >
              {nav.map((item) => (
                <li key={item.href} className="flex-1">
                  <DockLink item={item} />
                </li>
              ))}
            </ul>
          </LayoutGroup>
        </nav>

        <div id="guest-overlay-root" />
      </div>
    </MotionConfig>
  );
}

function BarLink({ item }: { item: GuestNavItem }) {
  const { icon: Icon } = item;
  return (
    <NavLink
      to={item.href}
      end
      className={({ isActive }) =>
        clsx(
          'relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
          isActive ? 'text-guest-ink' : 'text-guest-muted hover:text-guest-ink',
          FOCUS,
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="guest-bar-pill" className={PILL} transition={snappy} />}
          <Icon size={18} weight={isActive ? 'fill' : 'regular'} aria-hidden className="relative" />
          <span className="relative">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function DockLink({ item }: { item: GuestNavItem }) {
  const { icon: Icon } = item;
  return (
    <NavLink
      to={item.href}
      end
      className={({ isActive }) =>
        clsx(
          'relative flex flex-col items-center gap-0.5 rounded-full px-2 py-2 text-[11px] font-medium transition-[color,transform] active:scale-[0.96]',
          isActive ? 'text-guest-ink' : 'text-guest-muted',
          FOCUS,
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="guest-dock-pill" className={PILL} transition={snappy} />}
          <Icon size={22} weight={isActive ? 'fill' : 'regular'} aria-hidden className="relative" />
          <span className="relative">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
