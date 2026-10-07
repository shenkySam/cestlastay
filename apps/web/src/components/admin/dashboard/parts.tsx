import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { ErrorState } from '@/components/admin/ui';

interface GateSlice<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

interface TileGateProps<T> {
  slice: GateSlice<T>;
  /** Layout-matched placeholder */
  skeleton: ReactNode;
  onRetry: () => void;
  errorTitle?: string;
  /** Extra classes for the error box (e.g. padding inside a flush Panel) */
  errorClassName?: string;
  children: (data: T) => ReactNode;
}

/**
 * Data first (stale data stays visible during a refresh), then the inline
 * error with retry, then the skeleton.
 */
export function TileGate<T>({ slice, skeleton, onRetry, errorTitle, errorClassName, children }: TileGateProps<T>) {
  if (slice.data != null) return <>{children(slice.data)}</>;
  if (slice.error && !slice.loading) return <ErrorState title={errorTitle} onRetry={onRetry} className={errorClassName} />;
  return <>{skeleton}</>;
}

/** Quiet header link for a tile ("View all", "Open queue"). */
export function TileLink({ to, children, icon: IconCmp = ArrowRightIcon }: { to: string; children: ReactNode; icon?: Icon }) {
  return (
    <Link to={to} className="btn-ghost -mr-2 -mt-1 gap-1.5 py-1.5 text-[13px]">
      {children}
      <IconCmp size={14} weight="regular" />
    </Link>
  );
}

/** Label over a mono value — used in divide-x stat footers. */
export function MiniStat({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('min-w-0', className)}>
      <dt className="truncate text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 truncate font-mono text-sm font-medium tabular-nums text-zinc-900 md:text-base">{value}</dd>
      {hint && <dd className="mt-0.5 truncate text-[11px] text-zinc-500">{hint}</dd>}
    </div>
  );
}
