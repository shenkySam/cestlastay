import { memo, useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

const PROMPTS = [
  'Jump to bookings',
  'Record a payment',
  'Open the front desk',
  'Review guest ratings',
  'Add a room',
];

const STATIC_HINT = 'Search or jump to…';

// Milliseconds
const START = 700;
const TYPE = 62;
const DELETE = 28;
const HOLD = 1800;
const GAP = 420;

/**
 * Types, holds, deletes and cycles real palette prompts. Text is written to
 * the DOM through a ref inside a setTimeout chain, so the loop never
 * re-renders React. Reduced motion gets a static hint.
 */
export const TypewriterHint = memo(function TypewriterHint({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (reduce || !el) return;

    let prompt = 0;
    let length = 0;
    let deleting = false;
    let timer = 0;
    el.textContent = '';

    const tick = () => {
      const word = PROMPTS[prompt];
      if (!deleting) {
        length += 1;
        el.textContent = word.slice(0, length);
        if (length >= word.length) {
          deleting = true;
          timer = window.setTimeout(tick, HOLD);
          return;
        }
        timer = window.setTimeout(tick, TYPE);
        return;
      }
      length -= 1;
      el.textContent = word.slice(0, length);
      if (length <= 0) {
        deleting = false;
        prompt = (prompt + 1) % PROMPTS.length;
        timer = window.setTimeout(tick, GAP);
        return;
      }
      timer = window.setTimeout(tick, DELETE);
    };

    timer = window.setTimeout(tick, START);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  if (reduce) {
    return <span className={clsx('truncate', className)}>{STATIC_HINT}</span>;
  }

  return (
    <span aria-hidden className={clsx('flex min-w-0 items-center overflow-hidden whitespace-pre', className)}>
      <span ref={textRef} className="truncate" />
      <span className="ml-px inline-block h-4 w-[1.5px] shrink-0 rounded-full bg-lagoon-500 animate-caret" />
    </span>
  );
});
