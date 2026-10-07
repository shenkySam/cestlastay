import { memo, useEffect, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import clsx from 'clsx';

interface AnimatedNumberProps {
  value: number;
  /** Formats the in-flight value, e.g. `money` or `(n) => pct(n)` */
  format?: (n: number) => string;
  className?: string;
}

/**
 * Springs from the previous value to the new one. The text is a motion value,
 * so the count-up never re-renders React.
 */
export const AnimatedNumber = memo(function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  className,
}: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const fmt = useRef(format);
  fmt.current = format;

  const target = useMotionValue(reduce ? value : 0);
  const smooth = useSpring(target, { stiffness: 100, damping: 20, mass: 0.8 });
  const text = useTransform(smooth, (v) => fmt.current(v));

  useEffect(() => {
    if (reduce) smooth.jump(value);
    target.set(value);
  }, [value, reduce, target, smooth]);

  return <motion.span className={clsx('tabular-nums', className)}>{text}</motion.span>;
});
