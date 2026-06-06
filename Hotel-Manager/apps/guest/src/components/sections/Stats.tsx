import { useEffect, useRef, useState } from 'react';
import { stats } from '../../lib/content';
import type { Stat } from '../../lib/content';
import { prefersReducedMotion } from '../../lib/gsap';

function StatItem({ stat, run }: { stat: Stat; run: boolean }) {
  const isInt = Number.isInteger(stat.value);
  const [val, setVal] = useState(prefersReducedMotion() ? stat.value : 0);

  useEffect(() => {
    if (!run || prefersReducedMotion()) {
      setVal(stat.value);
      return;
    }
    let raf = 0;
    const duration = 1500;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(stat.value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(stat.value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, stat.value]);

  const display = isInt ? Math.round(val).toString() : val.toFixed(1);

  return (
    <div className="text-center">
      <p className="font-serif text-[clamp(2.4rem,5vw,3.6rem)] font-medium leading-none text-white">
        {stat.prefix}
        {display}
        {stat.suffix}
      </p>
      <p className="mt-3 font-sans text-xs uppercase tracking-[0.18em] text-white">{stat.label}</p>
    </div>
  );
}

export default function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setRun(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="relative">
      <div className="scrim-text pointer-events-none absolute inset-0" aria-hidden />
      <div ref={ref} className="container-x py-20 md:py-24">
        <div className="grid grid-cols-2 gap-y-12 md:grid-cols-4">
          {stats.map((s) => (
            <StatItem key={s.label} stat={s} run={run} />
          ))}
        </div>
      </div>
    </section>
  );
}
