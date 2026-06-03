import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../lib/gsap';

// Single Lenis instance shared across the app so anchor links can drive it.
let lenis: Lenis | null = null;

/**
 * Mounts the smooth-scroll engine and keeps GSAP ScrollTrigger in sync with it.
 * Call once, near the root. Honours prefers-reduced-motion by skipping Lenis
 * entirely (the browser's native scroll is used instead).
 */
export function useSmoothScroll(): void {
  useEffect(() => {
    if (prefersReducedMotion()) {
      ScrollTrigger.refresh();
      return;
    }

    lenis = new Lenis({
      duration: 1.2,
      // gentle exponential ease — long, liquid deceleration
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4,
    });

    lenis.on('scroll', ScrollTrigger.update);

    // Dev-only handle for debugging/verification (stripped from prod builds).
    if (import.meta.env.DEV) (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    const tick = (time: number) => {
      // gsap ticker time is in seconds; Lenis expects milliseconds
      lenis?.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
    };
  }, []);
}

/** Smoothly scroll to an in-page anchor (e.g. "#rooms"). */
export function scrollToSection(target: string): void {
  if (lenis) {
    lenis.scrollTo(target, { offset: -4, duration: 1.4 });
  } else {
    document
      .querySelector(target)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
