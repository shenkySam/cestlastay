import type { MouseEvent, ReactNode } from 'react';
import clsx from 'clsx';
import { scrollToSection } from '../../hooks/useSmoothScroll';

type Variant = 'primary' | 'accent' | 'outline' | 'outline-light';

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  size?: 'md' | 'lg';
  /** if set, renders an anchor; an in-page "#hash" smooth-scrolls */
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  outline: 'btn-outline',
  'outline-light': 'btn-outline-light',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  type = 'button',
  className,
  disabled,
  ariaLabel,
}: ButtonProps) {
  const cls = clsx(variantClass[variant], size === 'lg' && 'btn-lg', className);

  if (href) {
    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      if (href.startsWith('#')) {
        e.preventDefault();
        scrollToSection(href);
      }
      onClick?.();
    };
    return (
      <a href={href} onClick={handleClick} className={cls} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cls}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
