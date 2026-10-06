import { memo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { riseItem, Skeleton } from '@/components/admin/ui';

export interface KpiItem {
  label: string;
  /** Pre-formatted; '—' when its slice hasn't loaded */
  value: string;
}

interface KpiMarqueeProps {
  items: KpiItem[];
  loading: boolean;
}

/**
 * Wide Data Stream: one slim pill with an endless, looping KPI ticker.
 * The track holds two identical copies and the `marquee` keyframe moves it
 * -50%, so the loop has no seam. Hover pauses it; reduced motion turns it
 * into a static wrapped row (the duplicate copy is hidden).
 */
export const KpiMarquee = memo(function KpiMarquee({ items, loading }: KpiMarqueeProps) {
  return (
    <motion.div
      variants={riseItem}
      aria-label="Key figures, last 30 days (focus or tap to pause)"
      role="region"
      // Focusable so keyboard and touch users can pause the ticker (WCAG 2.2.2)
      tabIndex={0}
      className={clsx(
        'group relative overflow-hidden rounded-full border border-zinc-200/60 bg-white py-3',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-lagoon-500/40',
        'shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_12px_28px_-18px_rgb(24_24_27/0.12)]',
        '[-webkit-mask-image:linear-gradient(90deg,transparent,white_6%,white_94%,transparent)]',
        '[mask-image:linear-gradient(90deg,transparent,white_6%,white_94%,transparent)]',
        'motion-reduce:rounded-[2rem] motion-reduce:px-6 motion-reduce:[-webkit-mask-image:none] motion-reduce:[mask-image:none]',
      )}
    >
      {loading ? (
        <div className="flex items-center gap-8 px-8" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-36 shrink-0 rounded-full" />
          ))}
        </div>
      ) : (
        <div className="flex w-max animate-marquee hover:[animation-play-state:paused] group-focus:[animation-play-state:paused] motion-reduce:w-full motion-reduce:animate-none">
          <KpiRun items={items} />
          <KpiRun items={items} duplicate />
        </div>
      )}
    </motion.div>
  );
});

/** One copy of the run. Items repeat twice inside so a copy is always wider than the strip. */
function KpiRun({ items, duplicate }: { items: KpiItem[]; duplicate?: boolean }) {
  const run = [...items, ...items];
  return (
    <ul
      aria-hidden={duplicate || undefined}
      className={clsx(
        'flex shrink-0 items-center',
        duplicate ? 'motion-reduce:hidden' : 'motion-reduce:flex-wrap motion-reduce:gap-y-2',
      )}
    >
      {run.map((item, i) => {
        const repeat = i >= items.length;
        return (
          <li
            key={`${item.label}-${i}`}
            aria-hidden={(!duplicate && repeat) || undefined}
            className={clsx(
              'flex items-center gap-2 whitespace-nowrap pl-6 text-sm',
              repeat && 'motion-reduce:hidden',
            )}
          >
            <span className="text-zinc-500">{item.label}</span>
            <span className="font-mono font-medium tabular-nums text-zinc-900">{item.value}</span>
            <span aria-hidden className="ml-4 size-1 rounded-full bg-zinc-300" />
          </li>
        );
      })}
    </ul>
  );
}
