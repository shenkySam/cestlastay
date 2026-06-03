import type { ElementType, ReactNode } from 'react';
import { useReveal } from '../../hooks/useReveal';

interface RevealProps {
  as?: ElementType;
  className?: string;
  id?: string;
  children: ReactNode;
  y?: number;
  delay?: number;
  duration?: number;
  /** stagger direct children (seconds) for grouped reveals */
  stagger?: number;
  start?: string;
}

/** Wrapper that fades + slides its content up as it scrolls into view. */
export default function Reveal({
  as: Tag = 'div',
  className,
  id,
  children,
  ...opts
}: RevealProps) {
  const ref = useReveal<HTMLElement>(opts);
  const Comp = Tag as ElementType;
  return (
    <Comp ref={ref as never} className={className} id={id}>
      {children}
    </Comp>
  );
}
