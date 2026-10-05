import { useLayoutEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '../lib/gsap';

interface ParallaxOptions {
  /** total travel as a percentage of the element's height (±speed) */
  speed?: number;
}

/**
 * Scroll-linked vertical parallax. Attach the returned ref to an element that
 * is taller than its (overflow-hidden) container so no gap is exposed as it
 * travels. No-ops under reduced motion.
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(
  opts: ParallaxOptions = {},
) {
  const ref = useRef<T>(null);
  const { speed = 10 } = opts;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { yPercent: -speed },
        {
          yPercent: speed,
          ease: 'none',
          scrollTrigger: {
            trigger: el.parentElement ?? el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      );
    });

    return () => ctx.revert();
  }, [speed]);

  return ref;
}
