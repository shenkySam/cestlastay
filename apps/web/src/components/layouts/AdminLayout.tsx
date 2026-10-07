import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LayoutGroup, MotionConfig, motion } from 'framer-motion';
import { AdminSidebar } from '@/components/admin/shell/AdminSidebar';
import { AdminTopbar } from '@/components/admin/shell/AdminTopbar';
import { NavDrawer } from '@/components/admin/shell/NavDrawer';
import { LiveActivityIsland } from '@/components/admin/shell/LiveActivityIsland';
import { useMediaQuery } from '@/components/admin/shell/hooks';

const CANVAS = '#f9fafb';

/**
 * Admin console frame ("Lagoon").
 *
 * Containment rule: neither .admin-shell nor any ancestor of <Outlet/> may
 * carry transform, filter, backdrop-filter or will-change. InvoiceEditor
 * renders inline `position: fixed` overlays inside pages, and a transformed
 * ancestor would become their containing block. That's why the route
 * transition animates opacity only, and why the blur lives on the top bar
 * (a sibling of <main>, not an ancestor).
 */
export function AdminLayout() {
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // The drawer closes on navigation and whenever the rail takes over.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname, isDesktop]);

  // Match the page canvas so overscroll never flashes the guest site's sand.
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
      <div className="admin-shell min-h-[100dvh]">
        <div className="lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
          <aside className="sticky top-0 hidden h-[100dvh] self-start border-r border-zinc-200/60 lg:block">
            <LayoutGroup id="admin-nav-rail">
              <AdminSidebar />
            </LayoutGroup>
          </aside>

          <div className="flex min-h-[100dvh] min-w-0 flex-col">
            <AdminTopbar onOpenNav={openNav} menuButtonRef={menuButtonRef} />
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

        <NavDrawer open={navOpen} sidebar={AdminSidebar} onClose={closeNav} onNavigate={dismissNav} />
        <LiveActivityIsland />
        <div id="admin-overlay-root" />
      </div>
    </MotionConfig>
  );
}
