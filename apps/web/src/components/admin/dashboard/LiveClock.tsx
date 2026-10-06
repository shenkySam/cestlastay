import { memo, useLayoutEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ClockIcon } from '@phosphor-icons/react';
import clsx from 'clsx';

/**
 * Ticking HH:mm:ss pill. Writes straight into the DOM once a second — no React
 * state, so the clock never re-renders the dashboard around it.
 */
export const LiveClock = memo(function LiveClock({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const tick = () => {
      if (ref.current) ref.current.textContent = format(new Date(), 'HH:mm:ss');
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      aria-hidden
      className={clsx(
        'inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-zinc-400 ring-1 ring-inset ring-zinc-200/70',
        className,
      )}
    >
      <ClockIcon size={15} weight="regular" />
      <span ref={ref} className="inline-block w-[8ch] font-mono text-sm tabular-nums text-zinc-700" />
    </div>
  );
});
