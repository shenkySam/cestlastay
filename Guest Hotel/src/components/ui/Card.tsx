import type { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** Surface with the Japandi soft-daylight shadow + hairline border. */
export default function Card({ children, className }: CardProps) {
  return <div className={clsx('card', className)}>{children}</div>;
}
