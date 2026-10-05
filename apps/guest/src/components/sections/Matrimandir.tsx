import { lazy, Suspense } from 'react';
import Reveal from '../ui/Reveal';

// three.js sphere shipped in its own lazy chunk (kept out of the initial bundle)
const MatrimandirSphere = lazy(() => import('../scenes/MatrimandirSphere'));

// Section copy. Move into src/lib/content.ts if you want it on the no-code
// editing surface (export const matrimandir = { ... }).
const copy = {
  eyebrow: 'The Matrimandir',
  title: 'The golden sphere, up close',
  body:
    'Minutes from your room stands the Matrimandir — Auroville’s golden heart, a place of stillness and light. Move your cursor to turn it; the particles gather at its base like the dawn settling over the township.',
  hint: 'Drag or move your cursor to explore',
};

export default function Matrimandir() {
  return (
    <section id="matrimandir" className="section relative">
      <div className="container-x grid items-center gap-14 md:grid-cols-[0.82fr_1.18fr] md:gap-16">
        {/* Copy */}
        <Reveal className="m3d-copy">
          <p className="eyebrow mb-4">{copy.eyebrow}</p>
          <h2 className="font-serif text-[clamp(2rem,4.4vw,3.6rem)] font-medium leading-[1.08] text-ink">
            {copy.title}
          </h2>
          <p className="mt-5 max-w-md font-sans leading-relaxed copy-on-scene">{copy.body}</p>
          <p className="mt-7 inline-flex items-center gap-2 font-sans text-sm text-sunset-600">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sunset-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sunset-600" />
            </span>
            {copy.hint}
          </p>
        </Reveal>

        {/* Interactive sphere */}
        <div className="relative mx-auto aspect-square w-full max-h-[660px]">
          <Suspense fallback={null}>
            <MatrimandirSphere />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
