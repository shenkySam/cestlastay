import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface ChartTooltipProps {
  /** Anchor point in container pixels */
  x: number;
  y: number;
  containerWidth: number;
  /** Formatted value — the strong element */
  value: ReactNode;
  /** Category / date — secondary */
  label: ReactNode;
  /** Place below the anchor instead of above (when the anchor is near the top) */
  below?: boolean;
}

/**
 * Small white readout for chart hover/focus. Values lead (mono, strong), the
 * label follows; a short lagoon stroke keys the series. Text stays in zinc ink.
 */
export function ChartTooltip({ x, y, containerWidth, value, label, below }: ChartTooltipProps) {
  const ratio = containerWidth > 0 ? x / containerWidth : 0.5;
  const tx = ratio < 0.18 ? '-12px' : ratio > 0.82 ? 'calc(-100% + 12px)' : '-50%';
  const ty = below ? '14px' : 'calc(-100% - 14px)';

  return (
    <div
      className="pointer-events-none absolute left-0 top-0"
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      <div style={{ transform: `translate(${tx}, ${ty})` }}>
        <motion.div
          role="status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="whitespace-nowrap rounded-xl bg-white px-3 py-2 shadow-[0_12px_28px_-12px_rgb(24_24_27/0.22)] ring-1 ring-zinc-200"
        >
          <p className="flex items-center gap-2 font-mono text-sm font-medium tabular-nums text-zinc-900">
            <span aria-hidden className="h-0.5 w-3 rounded-full bg-lagoon-600" />
            {value}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">{label}</p>
        </motion.div>
      </div>
    </div>
  );
}
