import { ReactNode } from 'react';
import clsx from 'clsx';

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Buttons, search, filters — right-aligned on md+, stacked below on mobile */
  actions?: ReactNode;
  className?: string;
}

/** Left-aligned page title block. Hierarchy comes from weight and color, not size. */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={clsx('flex flex-col gap-5 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className={clsx('text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl', eyebrow && 'mt-2')}>
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-zinc-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
    </header>
  );
}
