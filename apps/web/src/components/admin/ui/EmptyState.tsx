import { ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';
import clsx from 'clsx';

interface EmptyStateProps {
  icon: Icon;
  title: ReactNode;
  /** Say how this area gets populated */
  description?: ReactNode;
  action?: ReactNode;
  /** Tighter spacing for use inside small tiles */
  compact?: boolean;
  className?: string;
}

export function EmptyState({ icon: IconCmp, title, description, action, compact, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 py-8' : 'gap-3 py-14',
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-400 ring-1 ring-inset ring-zinc-200/70">
        <IconCmp size={20} weight="regular" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-zinc-900">{title}</p>
        {description && <p className="mx-auto max-w-[42ch] text-sm leading-relaxed text-zinc-500">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
