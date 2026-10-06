import { PointerEvent, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { useElementWidth } from './useElementWidth';
import { Axes, anchorFor, useChartCursor } from './Axes';
import { ChartTooltip } from './ChartTooltip';
import { axisGutter, clamp, monotonePath, niceScale, thinIndices } from './scale';

export interface ChartDatum {
  label: string;
  value: number;
}

interface AreaChartProps {
  data: ChartDatum[];
  /** Tooltip / direct-label format */
  format: (n: number) => string;
  /** Y-axis tick format (defaults to `format`) — e.g. compact money */
  axisFormat?: (n: number) => string;
  height?: number;
  /** Mark and label the peak point (one selective direct label) */
  labelPeak?: boolean;
  'aria-label'?: string;
  className?: string;
}

const M = { top: 22, right: 10, bottom: 28 };

/**
 * Single-series lagoon area: 2px monotone line over a 10% wash, recessive grid,
 * crosshair + tooltip on hover and on arrow-key focus. The line draws itself in
 * (pathLength spring) whenever the series changes.
 */
export function AreaChart({
  data,
  format,
  axisFormat = format,
  height = 220,
  labelPeak = true,
  className,
  'aria-label': ariaLabel,
}: AreaChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const reduce = useReducedMotion();
  const n = data.length;
  const { active, setActive, focusProps } = useChartCursor(n);

  const geo = useMemo(() => {
    const values = data.map((d) => Number(d.value) || 0);
    const { top, ticks } = niceScale(Math.max(0, ...values));
    const left = axisGutter(ticks.map(axisFormat));
    const plotW = Math.max(0, width - left - M.right);
    const plotH = Math.max(0, height - M.top - M.bottom);
    const baseline = M.top + plotH;
    const xAt = (i: number) => left + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1));
    const yAt = (v: number) => M.top + plotH - (v / top) * plotH;
    const pts = values.map((v, i) => [xAt(i), yAt(v)] as const);
    const line = monotonePath(pts);
    const area = n > 0 ? `${line}L${pts[n - 1][0]},${baseline}L${pts[0][0]},${baseline}Z` : '';
    const peak = values.reduce((best, v, i) => (v > values[best] ? i : best), 0);
    const labels = [...thinIndices(n, width < 480 ? 4 : 6)].map((i) => ({
      x: xAt(i),
      text: data[i].label,
      anchor: anchorFor(i, n),
    }));
    return { values, ticks, left, plotW, baseline, xAt, yAt, pts, line, area, peak, labels };
  }, [data, n, width, height, axisFormat]);

  const signature = `${n}:${data[0]?.label ?? ''}:${data[n - 1]?.label ?? ''}`;

  const onPointerMove = (e: PointerEvent<SVGRectElement>) => {
    if (n === 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    const ratio = box.width > 0 ? (e.clientX - box.left) / box.width : 0;
    setActive(clamp(Math.round(ratio * (n - 1)), 0, n - 1));
  };

  const peakValue = geo.values[geo.peak] ?? 0;
  const showPeak = labelPeak && active == null && peakValue > 0;
  const peakX = geo.pts[geo.peak]?.[0] ?? 0;
  const peakAnchor = peakX < geo.left + 40 ? 'start' : peakX > width - 50 ? 'end' : 'middle';

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

          <g key={signature}>
            <motion.path
              d={geo.area}
              className="fill-lagoon-500/10"
              initial={{ opacity: reduce ? 1 : 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'spring', duration: 1.2, bounce: 0, delay: reduce ? 0 : 0.35 }}
            />
            <motion.path
              d={geo.line}
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-lagoon-600"
              initial={{ pathLength: reduce ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ type: 'spring', duration: 1.6, bounce: 0 }}
            />
          </g>

          {showPeak && (
            <g aria-hidden>
              <circle cx={peakX} cy={geo.pts[geo.peak][1]} r={3.5} strokeWidth={2} className="fill-lagoon-600 stroke-white" />
              <text
                x={peakX}
                y={geo.pts[geo.peak][1] - 10}
                textAnchor={peakAnchor}
                className="fill-zinc-500 font-mono text-[11px] tabular-nums"
              >
                {format(peakValue)}
              </text>
            </g>
          )}

          {active != null && (
            <g aria-hidden>
              <line
                x1={geo.pts[active][0]}
                x2={geo.pts[active][0]}
                y1={M.top}
                y2={geo.baseline}
                strokeWidth={1}
                className="stroke-zinc-300"
              />
              <circle
                cx={geo.pts[active][0]}
                cy={geo.pts[active][1]}
                r={4.5}
                strokeWidth={2}
                className="fill-lagoon-600 stroke-white"
              />
            </g>
          )}

          {/* Hit layer: the whole plot, wider than the 2px line */}
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
          x={geo.pts[active][0]}
          y={geo.pts[active][1]}
          below={geo.pts[active][1] < 64}
          containerWidth={width}
          value={format(geo.values[active])}
          label={data[active].label}
        />
      )}
    </div>
  );
}
