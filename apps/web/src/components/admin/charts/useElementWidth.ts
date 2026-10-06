import { useLayoutEffect, useRef, useState } from 'react';

/** Tracks an element's content width with a ResizeObserver (disconnected on unmount). */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.round(el.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      setWidth((prev) => (prev === next ? prev : next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
