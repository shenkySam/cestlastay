import { ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { ArrowClockwiseIcon, CircleNotchIcon, WarningCircleIcon } from '@phosphor-icons/react';
import clsx from 'clsx';

/** Page title block: Cormorant display title, a line of context, optional action. */
export function PageIntro({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="font-cormorant text-[2.125rem] font-semibold leading-[1.05] tracking-[-0.01em] sm:text-[2.75rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-guest-muted">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}

/** Clay-tinted square holding an icon; decorative, so pair it with text. */
export function IconTile({ icon: IconCmp, className }: { icon: Icon; className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'flex size-11 shrink-0 items-center justify-center rounded-2xl bg-guest-clay/10 text-guest-clay',
        className,
      )}
    >
      <IconCmp size={22} />
    </span>
  );
}

export type Tone = 'clay' | 'gold' | 'palm' | 'danger' | 'neutral';

const TONE: Record<Tone, string> = {
  clay: 'bg-guest-clay/10 text-guest-clay ring-guest-clay/20',
  gold: 'bg-guest-gold/10 text-guest-gold ring-guest-gold/25',
  palm: 'bg-guest-palm/10 text-guest-palm ring-guest-palm/20',
  danger: 'bg-guest-danger/10 text-guest-danger ring-guest-danger/20',
  neutral: 'bg-guest-ink/[0.05] text-guest-muted ring-guest-ink/10',
};

/** Status pill. `live` adds a breathing dot, for states that are actively changing. */
export function Badge({
  tone = 'neutral',
  live,
  children,
  className,
}: {
  tone?: Tone;
  live?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        TONE[tone],
        className,
      )}
    >
      {live && (
        <span aria-hidden className="relative inline-flex size-1.5">
          <span className="absolute inset-0 animate-breathe rounded-full bg-current" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

/** Shimmering placeholder; size it like the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={clsx('relative overflow-hidden rounded-xl bg-guest-ink/[0.06]', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-guest-raised/70 to-transparent" />
    </div>
  );
}

/** Inline load failure with a retry. */
export function ErrorNote({
  title = 'Couldn’t load this',
  message = 'Check your connection, then try again.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-start gap-3 rounded-[1.5rem] border border-guest-danger/25 bg-guest-danger/[0.06] p-4 text-sm sm:px-5"
    >
      <WarningCircleIcon size={20} aria-hidden className="mt-px shrink-0 text-guest-danger" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-guest-muted">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost -my-1 px-3 py-1.5 text-sm">
          <ArrowClockwiseIcon size={16} aria-hidden />
          Try again
        </button>
      )}
    </div>
  );
}

/** Left-aligned "nothing here yet" panel that says how it gets filled. */
export function EmptyNote({
  icon,
  title,
  children,
  action,
}: {
  icon: Icon;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
      <IconTile icon={icon} />
      <div className="min-w-0 flex-1">
        <h2 className="text-[17px] font-medium leading-snug">{title}</h2>
        {children && <div className="mt-1 max-w-[52ch] text-sm leading-relaxed text-guest-muted">{children}</div>}
      </div>
      {action}
    </section>
  );
}

/** Button label while a request is in flight. */
export function Pending({ children }: { children: ReactNode }) {
  return (
    <>
      <CircleNotchIcon size={18} aria-hidden className="motion-safe:animate-spin" />
      {children}
    </>
  );
}

/** Inline field error, placed below the field it describes. */
export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-sm text-guest-danger">
      <WarningCircleIcon size={16} aria-hidden className="shrink-0" />
      {children}
    </p>
  );
}
