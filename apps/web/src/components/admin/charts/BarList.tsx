import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { spring } from '@/components/admin/ui';

export interface BarListItem {
  key: string | number;
  label: ReactNode;
  value: number;
  /** Direct label at the bar's end (defaults to `format(value)`) */
  display?: ReactNode;
  /** Quiet second line under the bar */
  sub?: ReactNode;
}

interface BarListProps {
  items: BarListItem[];
  format?: (n: number) => string;
  /** Sort by value, largest first (default). Off for ordinal data such as 5→1 stars. */
  sort?: boolean;
  /** Domain top; defaults to the largest value */
  max?: number;
  className?: string;
}

/**
 * Horizontal single-hue bars on a zinc-100 track with direct labels — the
 * categorical form (sources, rooms, star buckets). No rainbow, no legend.
 */
export function BarList({ items, format = (n) => String(Math.round(n)), sort = true, max, className }: BarListProps) {
  const reduce = useReducedMotion();
  const rows = sort ? [...items].sort((a, b) => b.value - a.value) : items;
  const top = max ?? Math.max(0, ...rows.map((r) => r.value));

  return (
    <ul className={clsx('space-y-4', className)}>
      {rows.map((row, i) => {
        const share = top > 0 ? Math.max(0, row.value) / top : 0;
        return (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-zinc-700">{row.label}</span>
              <span className="shrink-0 font-mono font-medium tabular-nums text-zinc-900">
                {row.display ?? format(row.value)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
              {share > 0 && (
                <motion.div
                  key={row.value}
                  className="h-full origin-left rounded-full bg-lagoon-500"
                  style={{ width: `${Math.max(share * 100, 2)}%` }}
                  initial={{ scaleX: reduce ? 1 : 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ ...spring, delay: reduce ? 0 : i * 0.05 }}
                />
              )}
            </div>
            {row.sub && <p className="mt-1.5 text-xs text-zinc-500">{row.sub}</p>}
          </li>
        );
      })}
    </ul>
  );
}
