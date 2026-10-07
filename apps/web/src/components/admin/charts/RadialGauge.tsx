import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { AnimatedNumber } from '@/components/admin/ui';

interface RadialGaugeProps {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  /** Caption under the number, e.g. "occupied" */
  label?: ReactNode;
  /** Accessible name prefix, e.g. "Live occupancy" */
  title?: string;
  className?: string;
}

const percent = (n: number) => `${Math.round(n)}%`;

/** Lagoon ring on a zinc-100 track; the arc springs to its value via pathLength. */
export function RadialGauge({ value, size = 168, stroke = 10, label, title = 'Value', className }: RadialGaugeProps) {
  const reduce = useReducedMotion();
  const v = Math.min(100, Math.max(0, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = size / 2;

  return (
    <div
      role="img"
      aria-label={`${title}: ${v.toFixed(1)}%`}
      className={clsx('relative shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} className="stroke-zinc-100" />
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-lagoon-600"
          initial={{ pathLength: reduce ? v / 100 : 0, opacity: v > 0 ? 1 : 0 }}
          animate={{ pathLength: v / 100, opacity: v > 0 ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 60, damping: 16 }}
        />
      </svg>
      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular-nums text-[2rem] font-medium leading-none tracking-tight text-zinc-950">
          <AnimatedNumber value={v} format={percent} />
        </span>
        {label && <span className="mt-1.5 text-xs text-zinc-500">{label}</span>}
      </div>
    </div>
  );
}
