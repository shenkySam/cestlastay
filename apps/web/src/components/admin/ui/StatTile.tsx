import { ReactNode } from 'react';
import type { Variants } from 'framer-motion';
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { Panel } from './Panel';
import { AnimatedNumber } from './AnimatedNumber';
import { Skeleton } from './Skeleton';

interface StatTileProps {
  label: ReactNode;
  /** A number animates (springs) through `format`; a node renders as-is */
  value: number | ReactNode;
  format?: (n: number) => string;
  /** Signed % change; null/undefined hides the pill */
  delta?: number | null;
  deltaLabel?: string;
  /** Set when a drop is good news (e.g. commission paid) */
  invertDelta?: boolean;
  hint?: ReactNode;
  icon?: Icon;
  loading?: boolean;
  /** Larger value for the lead tile of an asymmetric row */
  emphasis?: boolean;
  variants?: Variants;
  className?: string;
}

export function StatTile({
  label,
  value,
  format,
  delta,
  deltaLabel,
  invertDelta,
  hint,
  icon: IconCmp,
  loading,
  emphasis,
  variants,
  className,
}: StatTileProps) {
  return (
    <Panel variants={variants} className={clsx('justify-between', className)} bodyClassName="gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {IconCmp && (
          <span className="flex size-8 items-center justify-center rounded-full bg-zinc-50 text-zinc-500 ring-1 ring-inset ring-zinc-200/70">
            <IconCmp size={16} weight="regular" />
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2.5">
          <Skeleton className={clsx('rounded-lg', emphasis ? 'h-10 w-40' : 'h-8 w-28')} />
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
      ) : (
        <div className="space-y-2">
          <p
            className={clsx(
              'min-w-0 truncate font-medium tabular-nums tracking-tight text-zinc-950',
              emphasis ? 'text-3xl leading-tight xl:text-[2.75rem] xl:leading-none' : 'text-2xl leading-tight xl:text-[1.75rem]',
            )}
          >
            {typeof value === 'number' ? <AnimatedNumber value={value} format={format} /> : value}
          </p>
          {(delta != null || hint) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              {delta != null && <DeltaPill value={delta} invert={invertDelta} />}
              {deltaLabel && delta != null && <span>{deltaLabel}</span>}
              {hint && <span>{hint}</span>}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

export function DeltaPill({ value, invert, className }: { value: number; invert?: boolean; className?: string }) {
  const flat = Math.abs(value) < 0.05;
  const good = invert ? value < 0 : value > 0;
  const IconCmp = flat ? MinusIcon : value > 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums ring-1 ring-inset',
        flat
          ? 'bg-zinc-50 text-zinc-600 ring-zinc-200'
          : good
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
            : 'bg-rose-50 text-rose-700 ring-rose-600/15',
        className,
      )}
    >
      <IconCmp size={11} weight="bold" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}
