import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LayoutGroup, MotionConfig, motion } from 'framer-motion';
import { NavDrawer } from '@/components/admin/shell/NavDrawer';
import { useMediaQuery } from '@/components/admin/shell/hooks';
import { StaffSidebar } from '@/components/staff/shell/StaffSidebar';
import { StaffTopbar } from '@/components/staff/shell/StaffTopbar';

const CANVAS = '#f6f7f7';

/**
 * Front desk frame: the admin console's shell under .staff-shell, which mutes
 * the lagoon accent (see globals.css). Same containment rule as AdminLayout:
 * no transform/filter on any ancestor of <Outlet/>, because pages render
 * inline `position: fixed` modals.
 */
export function StaffLayout() {
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    setNavOpen(false);
  }, [pathname, isDesktop]);

  useEffect(() => {
    const { body } = document;
    const previous = body.style.backgroundColor;
    body.style.backgroundColor = CANVAS;
    return () => {
      body.style.backgroundColor = previous;
    };
  }, []);

  const openNav = useCallback(() => setNavOpen(true), []);
  const dismissNav = useCallback(() => setNavOpen(false), []);
  const closeNav = useCallback(() => {
    setNavOpen(false);
    menuButtonRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="staff-shell min-h-[100dvh]">
        <div className="lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
          <aside className="sticky top-0 hidden h-[100dvh] self-start border-r border-zinc-200/60 lg:block">
            <LayoutGroup id="staff-nav-rail">
              <StaffSidebar />
            </LayoutGroup>
          </aside>

          <div className="flex min-h-[100dvh] min-w-0 flex-col">
            <StaffTopbar onOpenNav={openNav} menuButtonRef={menuButtonRef} />
            <main className="flex-1">
              <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-10">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Outlet />
                </motion.div>
              </div>
            </main>
          </div>
        </div>

        <NavDrawer open={navOpen} sidebar={StaffSidebar} onClose={closeNav} onNavigate={dismissNav} />
        {/* Modal portals here so it stays inside .staff-shell */}
        <div id="admin-overlay-root" />
      </div>
    </MotionConfig>
  );
}
