import { useEffect, useRef, useState } from 'react';

/** Tilt, grid drift and autoplay only for a mouse-like pointer without reduced motion. */
export const RICH_MOTION_QUERY =
  '(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)';
export const WIDE_QUERY = '(min-width: 1024px)';

const MAX_TILT = 6; // degrees

/** Whether a media query matches, following changes (resize, OS setting). */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

const clamp = (n: number) => Math.max(-1, Math.min(1, n));

/**
 * Tilts the referenced element toward the pointer by writing CSS variables
 * (--rx/--ry in degrees, --mx/--my pointer position, --sheen 0–1) once per
 * animation frame — no React re-renders. The CSS reads them; with the hook
 * disabled they keep their stylesheet defaults (flat card).
 */
export function useTilt<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let frame = 0;
    const write = (rx: number, ry: number, mx: number, my: number, sheen: number) => {
      el.style.setProperty('--rx', rx.toFixed(2));
      el.style.setProperty('--ry', ry.toFixed(2));
      el.style.setProperty('--mx', `${mx.toFixed(1)}%`);
      el.style.setProperty('--my', `${my.toFixed(1)}%`);
      el.style.setProperty('--sheen', String(sheen));
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const { clientX, clientY } = e;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Measure the untilted parent so the tilt doesn't feed back into itself
        const r = (el.parentElement ?? el).getBoundingClientRect();
        const px = (clientX - r.left) / r.width;
        const py = (clientY - r.top) / r.height;
        // Pointer right → right edge recedes (rotateY+); pointer up → top recedes (rotateX+)
        write(-clamp(py * 2 - 1) * MAX_TILT, clamp(px * 2 - 1) * MAX_TILT, px * 100, py * 100, 1);
      });
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => write(0, 0, 50, 0, 0));
    };
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) reset(); // left the window
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut);
    window.addEventListener('blur', reset);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut);
      window.removeEventListener('blur', reset);
      for (const name of ['--rx', '--ry', '--mx', '--my', '--sheen']) el.style.removeProperty(name);
    };
  }, [enabled]);

  return ref;
}
