import { memo, PointerEvent, ReactNode, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

interface MagneticLinkProps {
  to: string;
  className?: string;
  children: ReactNode;
  /** Fraction of the cursor offset the button follows */
  strength?: number;
  /** Max pull in px */
  max?: number;
}

const SPRING = { stiffness: 150, damping: 15, mass: 0.4 };
const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

/**
 * A router link that leans a few px toward the cursor. Motion values + a spring
 * only (no React state); active only on hover-capable fine pointers and when the
 * user hasn't asked for reduced motion. The wrapper moves, so the button's own
 * CSS transform transition (active:scale) never fights the spring.
 */
export const MagneticLink = memo(function MagneticLink({
  to,
  className,
  children,
  strength = 0.3,
  max = 6,
}: MagneticLinkProps) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, SPRING);
  const sy = useSpring(y, SPRING);
  const finePointer = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => {
      finePointer.current = mq.matches;
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const onPointerMove = (e: PointerEvent<HTMLSpanElement>) => {
    if (!finePointer.current || reduce) return;
    const box = e.currentTarget.getBoundingClientRect();
    x.set(clamp((e.clientX - (box.left + box.width / 2)) * strength, max));
    y.set(clamp((e.clientY - (box.top + box.height / 2)) * strength, max));
  };

  const release = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span className="inline-flex" style={{ x: sx, y: sy }} onPointerMove={onPointerMove} onPointerLeave={release}>
      <Link to={to} className={className} onBlur={release}>
        {children}
      </Link>
    </motion.span>
  );
});
