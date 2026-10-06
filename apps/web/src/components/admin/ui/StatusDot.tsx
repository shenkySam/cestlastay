import { memo } from 'react';
import clsx from 'clsx';

export type Tone = 'lagoon' | 'emerald' | 'amber' | 'rose' | 'zinc';

const DOT: Record<Tone, string> = {
  lagoon: 'bg-lagoon-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  zinc: 'bg-zinc-400',
};

interface StatusDotProps {
  tone?: Tone;
  /** Breathing halo (CSS only, transform/opacity) */
  pulse?: boolean;
  className?: string;
}

/** A small status light. Never carries meaning alone — pair it with a label. */
export const StatusDot = memo(function StatusDot({ tone = 'emerald', pulse = true, className }: StatusDotProps) {
  return (
    <span aria-hidden className={clsx('relative inline-flex size-2 shrink-0', className)}>
      {pulse && <span className={clsx('absolute inset-0 rounded-full animate-breathe', DOT[tone])} />}
      <span className={clsx('relative inline-flex size-2 rounded-full', DOT[tone])} />
    </span>
  );
});
