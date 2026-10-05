import { Suspense, lazy } from 'react';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import Navbar from './components/layout/Navbar';
import Hero from './components/sections/Hero';
import Amenities from './components/sections/Amenities';
import Stats from './components/sections/Stats';
import Rooms from './components/sections/Rooms';
import Matrimandir from './components/sections/Matrimandir';
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

      {/* Soft cream veil so the warm particles stay subtle behind the content
          and text keeps its contrast on the light page. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(180deg, rgba(244,239,229,0.62) 0%, rgba(244,239,229,0.46) 32%, rgba(244,239,229,0.46) 68%, rgba(244,239,229,0.66) 100%)',
        }}
      />

      {/* All content floats above the scene */}
      <div className="relative z-10">
        <Navbar />
        <main>
          {/* Awe & Escape → Comfort → the golden sphere → Value → Action */}
          <Hero />
          <Amenities />
          <Stats />
          <Rooms />
          <Matrimandir />
          <Packages />
          <Reserve />
          <FooterCta />
        </main>
        <Footer />
      </div>

      {/* Film-grain texture over the whole page */}
      <div
        className="grain pointer-events-none fixed inset-0 z-[60] opacity-[0.04] mix-blend-multiply"
        aria-hidden
      />
    </>
  );
}
