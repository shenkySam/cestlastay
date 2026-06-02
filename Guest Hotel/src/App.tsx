import { Suspense, lazy } from 'react';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import Navbar from './components/layout/Navbar';
import Hero from './components/sections/Hero';
import Amenities from './components/sections/Amenities';
import Stats from './components/sections/Stats';
import Rooms from './components/sections/Rooms';
import Packages from './components/sections/Packages';
import Reserve from './components/sections/Reserve';
import FooterCta from './components/sections/FooterCta';
import Footer from './components/layout/Footer';

// Lazy so three.js ships in its own chunk (deferred, not in the initial bundle).
const SceneBackground = lazy(() => import('./components/scenes/SceneBackground'));

export default function App() {
  // Smooth inertia scroll + GSAP ScrollTrigger sync (honours reduced-motion).
  useSmoothScroll();

  return (
    <>
      {/* Persistent WebGL scene, fixed behind everything */}
      <Suspense fallback={null}>
        <SceneBackground />
      </Suspense>

      {/* Dim veil that calms the scene so content stays legible */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(180deg, rgba(3,9,14,0.52) 0%, rgba(3,9,14,0.4) 32%, rgba(3,9,14,0.4) 68%, rgba(3,9,14,0.58) 100%)',
        }}
      />

      {/* All content floats above the scene */}
      <div className="relative z-10">
        <Navbar />
        <main>
          {/* Awe & Escape → Comfort & Indulgence → Excitement & Value → Action */}
          <Hero />
          <Amenities />
          <Stats />
          <Rooms />
          <Packages />
          <Reserve />
          <FooterCta />
        </main>
        <Footer />
      </div>

      {/* Film-grain texture over the whole page */}
      <div
        className="grain pointer-events-none fixed inset-0 z-[60] opacity-[0.06] mix-blend-overlay"
        aria-hidden
      />
    </>
  );
}
