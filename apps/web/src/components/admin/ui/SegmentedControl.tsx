import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { Icon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { snappy } from './motion';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: ReactNode;
  /** Small mono count after the label */
  count?: number;
  icon?: Icon;
}

interface SegmentedControlProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Must be unique per control instance on the page (drives the sliding pill) */
  layoutId: string;
  size?: 'sm' | 'md';
  'aria-label'?: string;
  className?: string;
}

/** Zinc track with a white pill that springs between options. */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  layoutId,
  size = 'md',
  className,
  ...aria
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={aria['aria-label']}
      className={clsx('inline-flex shrink-0 items-center gap-0.5 rounded-full bg-zinc-100/80 p-1 ring-1 ring-inset ring-zinc-200/60', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const IconCmp = opt.icon;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={clsx(
              'relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors duration-200 active:scale-[0.98]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-lagoon-500/40',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]',
              active ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-800',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={snappy}
                className="absolute inset-0 rounded-full bg-white shadow-[0_1px_2px_rgb(24_24_27/0.08),inset_0_1px_0_rgb(255_255_255/0.9)] ring-1 ring-zinc-200/70"
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {IconCmp && <IconCmp size={size === 'sm' ? 13 : 15} weight="regular" />}
              {opt.label}
              {opt.count !== undefined && (
                <span className={clsx('font-mono tabular-nums', active ? 'text-lagoon-700' : 'text-zinc-500')}>
                  {opt.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
