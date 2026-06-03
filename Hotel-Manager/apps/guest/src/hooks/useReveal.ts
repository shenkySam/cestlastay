import { useLayoutEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '../lib/gsap';

interface RevealOptions {
  /** vertical travel in px (brief: 10–20px) */
  y?: number;
  delay?: number;
  duration?: number;
  /** if > 0, animate the element's direct children with this stagger */
  stagger?: number;
  /** ScrollTrigger start position */
  start?: string;
}

/**
 * Scroll-triggered reveal: fade in + gentle slide-up as the element enters the
 * viewport. Returns a ref to attach. No-ops (stays visible) under reduced motion.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  opts: RevealOptions = {},
) {
  const ref = useRef<T>(null);
  const { y = 16, delay = 0, duration = 0.9, stagger = 0, start = 'top 85%' } = opts;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const targets = stagger > 0 ? gsap.utils.toArray<HTMLElement>(el.children) : el;
      gsap.fromTo(
        targets,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          y: 0,
          duration,
          delay,
          ease: 'power2.out',
          stagger: stagger > 0 ? stagger : 0,
          scrollTrigger: { trigger: el, start, once: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [y, delay, duration, stagger, start]);

  return ref;
}
