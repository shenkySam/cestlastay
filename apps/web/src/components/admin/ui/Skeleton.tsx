import clsx from 'clsx';

/** Shimmering placeholder — size it to match the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={clsx('relative overflow-hidden rounded-xl bg-zinc-100', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/80 to-transparent" />
    </div>
  );
}

interface SkeletonRowsProps {
  rows?: number;
  /** Show a leading avatar circle on each row */
  avatar?: boolean;
  className?: string;
}

/** List/table placeholder: avatar + two lines + a trailing value per row. */
export function SkeletonRows({ rows = 5, avatar = true, className }: SkeletonRowsProps) {
  return (
    <div role="status" aria-label="Loading" className={clsx('divide-y divide-zinc-100', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3.5">
          {avatar && <Skeleton className="size-9 shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 rounded-full" />
            <Skeleton className="h-2.5 w-2/5 rounded-full" />
          </div>
          <Skeleton className="h-3 w-14 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}
