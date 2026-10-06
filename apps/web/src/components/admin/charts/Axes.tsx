import { KeyboardEvent, useCallback, useState } from 'react';

export interface XLabel {
  x: number;
  text: string;
  anchor: 'start' | 'middle' | 'end';
}

interface AxesProps {
  ticks: number[];
  yAt: (v: number) => number;
  left: number;
  right: number;
  baseline: number;
  axisFormat: (n: number) => string;
  xLabels: XLabel[];
}

/**
 * Recessive frame shared by the column and area charts: hairline zinc-100
 * horizontals, one y-axis on the left, thinned x labels. 11px zinc-400 mono.
 */
export function Axes({ ticks, yAt, left, right, baseline, axisFormat, xLabels }: AxesProps) {
  return (
    <g aria-hidden className="font-mono text-[11px] tabular-nums">
      {ticks.map((t) => {
        const y = Math.round(yAt(t)) + 0.5;
        return (
          <g key={t}>
            <line
              x1={left}
              x2={right}
              y1={y}
              y2={y}
              strokeWidth={1}
              className={t === 0 ? 'stroke-zinc-200' : 'stroke-zinc-100'}
            />
            <text x={left - 10} y={y} dy="0.32em" textAnchor="end" className="fill-zinc-400">
              {axisFormat(t)}
            </text>
          </g>
        );
      })}
      {xLabels.map((l) => (
        <text key={`${l.x}-${l.text}`} x={l.x} y={baseline + 18} textAnchor={l.anchor} className="fill-zinc-400">
          {l.text}
        </text>
      ))}
    </g>
  );
}

export function anchorFor(i: number, n: number): XLabel['anchor'] {
  if (n > 1 && i === 0) return 'start';
  if (n > 1 && i === n - 1) return 'end';
  return 'middle';
}

/**
 * Hover + keyboard state for a chart: pointer picks the nearest index, arrow keys
 * step through points while the chart has focus (same readout as hover).
 */
export function useChartCursor(count: number) {
  const [active, setActive] = useState<number | null>(null);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (count === 0) return;
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        setActive(e.key === 'Home' ? 0 : count - 1);
      } else if (step) {
        e.preventDefault();
        setActive((cur) => Math.min(count - 1, Math.max(0, (cur ?? count - 1) + (cur == null ? 0 : step))));
      }
    },
    [count],
  );

  const focusProps = {
    tabIndex: 0,
    onKeyDown,
    onFocus: () => setActive((cur) => cur ?? count - 1),
    onBlur: () => setActive(null),
  };

  return { active: active != null && active < count ? active : null, setActive, focusProps };
}
