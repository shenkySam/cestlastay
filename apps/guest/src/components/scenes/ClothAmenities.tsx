import { useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Waves, Flower2, UtensilsCrossed, Sunrise } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Amenity } from '../../lib/content';
import { ScrollTrigger, prefersReducedMotion } from '../../lib/gsap';
import type { ClothSceneHandle } from '../../lib/cloth/clothScene';
import Img from '../ui/Img';
import Reveal from '../ui/Reveal';

const iconMap: Record<Amenity['icon'], LucideIcon> = {
  Waves,
  Flower2,
  UtensilsCrossed,
  Sunrise,
};

const hasWebGL = (): boolean => {
  try {
    const c = document.createElement('canvas');
    return (
      !!window.WebGLRenderingContext &&
      !!(c.getContext('webgl') || c.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
};

interface Props {
  items: Amenity[];
}

/**
 * Scroll-driven 3D cloth experience for the amenities. Falls back to an
 * accessible static grid under reduced-motion or when WebGL is unavailable —
 * so the four titles + descriptions are always real, indexable DOM.
 */
export default function ClothAmenities({ items }: Props) {
  const [interactive, setInteractive] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Decide capability on the client only (keeps SSR/initial render = static).
  useLayoutEffect(() => {
    if (!prefersReducedMotion() && hasWebGL()) setInteractive(true);
  }, []);

  useLayoutEffect(() => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    let cancelled = false;
    let scene: ClothSceneHandle | undefined;
    let st: ScrollTrigger | undefined;
    let io: IntersectionObserver | undefined;
    const onResize = () => scene?.resize();

    import('../../lib/cloth/clothScene').then(({ createClothScene }) => {
      if (cancelled) return;

      const applyTexts = (texts: number[]) => {
        for (let i = 0; i < texts.length; i++) {
          const el = overlayRefs.current[i];
          if (!el) continue;
          const o = texts[i];
          el.style.opacity = String(o);
          el.style.transform = `translateY(${((1 - o) * 14).toFixed(1)}px)`;
          el.style.pointerEvents = o > 0.6 ? 'auto' : 'none';
        }
      };

      scene = createClothScene(canvas, { items, onTexts: applyTexts });
      scene.resize();

      st = ScrollTrigger.create({
        trigger: viewport,
        start: 'top top',
        end: '+=400%',
        pin: viewport,
        scrub: true,
        onUpdate: (self) => scene?.setProgress(self.progress),
        onRefresh: () => scene?.resize(),
      });

      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => (e.isIntersecting ? scene?.start() : scene?.stop()));
        },
        { threshold: 0 },
      );
      io.observe(viewport);

      window.addEventListener('resize', onResize);
    });

    return () => {
      cancelled = true;
      io?.disconnect();
      st?.kill();
      window.removeEventListener('resize', onResize);
      scene?.dispose();
      ScrollTrigger.refresh();
    };
  }, [interactive, items]);

  if (!interactive) return <AmenitiesStatic items={items} />;

  return (
    <div ref={trackRef} className="relative mt-10">
      <div ref={viewportRef} className="relative h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

        {/* Crisp HTML text overlay — real DOM, fades in as each sheet settles */}
        <div className="pointer-events-none absolute left-1/2 top-[58%] w-[min(90vw,40rem)] -translate-x-1/2 -translate-y-1/2 px-6">
          {items.map((a, i) => {
            const Icon = iconMap[a.icon];
            return (
              <div
                key={a.title}
                ref={(el) => {
                  overlayRefs.current[i] = el;
                }}
                className="absolute inset-x-0 text-center"
                style={{ opacity: 0 }}
              >
                <Icon size={28} strokeWidth={1.4} className="mx-auto mb-3 text-white" />
                <h3 className="font-serif text-3xl text-white md:text-4xl">{a.title}</h3>
                <p className="mx-auto mt-3 max-w-md font-sans leading-relaxed text-white/85">
                  {a.description}
                </p>
              </div>
            );
          })}
        </div>

        <span className="pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 font-sans text-xs uppercase tracking-[0.18em] text-white/70">
          Scroll to draw back the sea linen
        </span>
      </div>
    </div>
  );
}

// Asymmetrical 12-col rhythm: 7/5, then 5/7 — the original static layout, kept
// as the reduced-motion / no-WebGL fallback.
const spans = ['md:col-span-7', 'md:col-span-5', 'md:col-span-5', 'md:col-span-7'];

function AmenitiesStatic({ items }: Props) {
  return (
    <div className="container-x">
      <Reveal className="mt-14 grid items-start gap-6 md:grid-cols-12" stagger={0.12}>
        {items.map((a, i) => {
          const Icon = iconMap[a.icon];
          return (
            <div key={a.title} className={spans[i % spans.length]}>
              <article
                className={clsx('group card h-full overflow-hidden', i % 2 === 1 && 'md:mt-12')}
              >
                <div className="relative">
                  <Img
                    src={a.image}
                    alt={a.title}
                    className={clsx('w-full', i % 2 === 0 ? 'aspect-[16/10]' : 'aspect-[4/3]')}
                    imgClassName="transition-transform duration-[1.4s] ease-breath group-hover:scale-[1.06]"
                  />
                  <div className="pointer-events-none absolute inset-0 scrim-bottom opacity-90" aria-hidden />
                  <div className="absolute bottom-0 left-0 p-6">
                    <Icon size={26} strokeWidth={1.4} className="mb-3 text-white" />
                    <h3 className="font-serif text-2xl text-white md:text-3xl">{a.title}</h3>
                  </div>
                </div>
                <p className="p-6 font-sans leading-relaxed text-muted">{a.description}</p>
              </article>
            </div>
          );
        })}
      </Reveal>
    </div>
  );
}
