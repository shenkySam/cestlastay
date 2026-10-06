import { PointerEvent, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { useElementWidth } from './useElementWidth';
import { Axes, anchorFor, useChartCursor } from './Axes';
import { ChartTooltip } from './ChartTooltip';
import type { ChartDatum } from './AreaChart';
import { axisGutter, clamp, fixedScale, niceScale, thinIndices } from './scale';

interface ColumnChartProps {
  data: ChartDatum[];
  format: (n: number) => string;
  axisFormat?: (n: number) => string;
  /** Fixed top of the domain (e.g. 100 for a rate) */
  max?: number;
  height?: number;
  'aria-label'?: string;
  className?: string;
}

const M = { top: 14, right: 6, bottom: 28 };
const GAP = 2;
const MAX_BAR = 24;
const RADIUS = 4;

/** Column with a rounded data-end and a square foot on the baseline. */
function columnPath(x: number, w: number, base: number, h: number): string {
  const r = Math.min(RADIUS, w / 2, h);
  const y = base - h;
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
}

/**
 * Single-series lagoon columns grown from the baseline (scaleY spring), 2px gap,
 * capped at 24px wide. Each column's band is its hover target; arrow keys step
 * through columns while focused.
 */
export function ColumnChart({
  data,
  format,
  axisFormat = format,
  max,
  height = 220,
  className,
  'aria-label': ariaLabel,
}: ColumnChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const reduce = useReducedMotion();
  const n = data.length;
  const { active, setActive, focusProps } = useChartCursor(n);

  const geo = useMemo(() => {
    const values = data.map((d) => Number(d.value) || 0);
    const { top, ticks } = max != null ? fixedScale(max) : niceScale(Math.max(0, ...values));
    const left = axisGutter(ticks.map(axisFormat));
    const plotW = Math.max(0, width - left - M.right);
    const plotH = Math.max(0, height - M.top - M.bottom);
    const baseline = M.top + plotH;
    const band = n > 0 ? plotW / n : 0;
    const barW = Math.max(1, Math.min(MAX_BAR, band - GAP));
    const yAt = (v: number) => M.top + plotH - (Math.min(v, top) / top) * plotH;
    const bars = values.map((v, i) => {
      const x = left + i * band + (band - barW) / 2;
      const h = Math.max(0, baseline - yAt(v));
      return { x, h, cx: x + barW / 2, top: baseline - h, d: h > 0 ? columnPath(x, barW, baseline, h) : '' };
    });
    const labels = [...thinIndices(n, width < 480 ? 4 : 6)].map((i) => ({
      x: bars[i].cx,
      text: data[i].label,
      anchor: anchorFor(i, n),
    }));
    return { values, ticks, left, plotW, baseline, band, yAt, bars, labels };
  }, [data, n, width, height, max, axisFormat]);

  const signature = `${n}:${data[0]?.label ?? ''}:${data[n - 1]?.label ?? ''}`;

  const onPointerMove = (e: PointerEvent<SVGRectElement>) => {
    if (n === 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    const ratio = box.width > 0 ? (e.clientX - box.left) / box.width : 0;
    setActive(clamp(Math.floor(ratio * n), 0, n - 1));
  };

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      className={clsx(
        'relative w-full select-none rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-lagoon-500/40',
        className,
      )}
      style={{ height }}
      {...focusProps}
    >
      {width > 0 && n > 0 && (
        <svg width={width} height={height} className="block overflow-visible">
          <Axes
            ticks={geo.ticks}
            yAt={geo.yAt}
            left={geo.left}
            right={width - M.right}
            baseline={geo.baseline}
            axisFormat={axisFormat}
            xLabels={geo.labels}
          />

          {active != null && (
            <rect
              aria-hidden
              x={geo.left + active * geo.band}
              y={M.top}
              width={geo.band}
              height={geo.baseline - M.top}
              rx={Math.min(6, geo.band / 2)}
              className="fill-zinc-100/70"
            />
          )}

          <g key={signature}>
            {geo.bars.map((b, i) =>
              b.d ? (
                <motion.path
                  key={i}
                  d={b.d}
                  className={clsx(
                    'transition-[fill] duration-200',
                    active === i ? 'fill-lagoon-700' : 'fill-lagoon-500',
                  )}
                  style={{ originY: 1, transformBox: 'fill-box' }}
                  initial={{ scaleY: reduce ? 1 : 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20, delay: reduce ? 0 : Math.min(i * 0.012, 0.5) }}
                />
              ) : null,
            )}
          </g>

          <rect
            x={geo.left}
            y={0}
            width={geo.plotW}
            height={geo.baseline}
            fill="transparent"
            style={{ touchAction: 'pan-y' }}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerMove}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      )}

      {active != null && width > 0 && (
        <ChartTooltip
          x={geo.bars[active].cx}
          y={geo.bars[active].top}
          below={geo.bars[active].top < 64}
          containerWidth={width}
          value={format(geo.values[active])}
          label={data[active].label}
        />
      )}
    </div>
  );
}
