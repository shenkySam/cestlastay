import { ArrowClockwiseIcon, WarningCircleIcon } from '@phosphor-icons/react';
import clsx from 'clsx';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/** Inline, non-blocking load failure with a retry. */
export function ErrorState({
  title = "Couldn't load this",
  message = 'Check your connection, then try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={clsx(
        'flex items-start gap-3 rounded-2xl border border-rose-200/70 bg-rose-50/60 px-4 py-3.5 text-sm',
        className,
      )}
    >
      <WarningCircleIcon size={18} weight="regular" className="mt-0.5 shrink-0 text-rose-600" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-rose-900">{title}</p>
        <p className="mt-0.5 text-rose-700/90">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 active:scale-[0.98]"
        >
          <ArrowClockwiseIcon size={14} weight="regular" />
          Retry
        </button>
      )}
    </div>
  );
}
