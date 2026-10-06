import { forwardRef, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';

export interface PanelProps extends Omit<HTMLMotionProps<'section'>, 'title' | 'children'> {
  /** Small uppercase label above the title */
  eyebrow?: ReactNode;
  title?: ReactNode;
  /** Right side of the header row (links, segmented controls, icon buttons) */
  action?: ReactNode;
  /** No body padding — for flush tables and edge-to-edge lists */
  flush?: boolean;
  bodyClassName?: string;
  children?: ReactNode;
}

/**
 * The console's tile surface: white, rounded-[2rem], hairline zinc border,
 * zinc-tinted diffusion shadow and a 1px inner top highlight.
 * It is a motion.section, so it accepts `variants={riseItem}` / `layout` etc.
 */
export const Panel = forwardRef<HTMLElement, PanelProps>(function Panel(
  { eyebrow, title, action, flush, className, bodyClassName, children, ...rest },
  ref,
) {
  const hasHeader = Boolean(eyebrow || title || action);
  return (
    <motion.section
      ref={ref}
      className={clsx(
        'relative flex min-w-0 flex-col rounded-[2rem] border border-zinc-200/60 bg-white',
        'shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_20px_40px_-15px_rgb(24_24_27/0.06)]',
        className,
      )}
      {...rest}
    >
      {hasHeader && (
        <header className="flex items-start justify-between gap-4 px-6 pt-6 md:px-8 md:pt-7">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && (
              <h2 className={clsx('text-base font-semibold tracking-tight text-zinc-900', eyebrow && 'mt-1.5')}>
                {title}
              </h2>
            )}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div
        className={clsx(
          'flex min-h-0 flex-1 flex-col',
          !flush && (hasHeader ? 'px-6 pb-6 pt-5 md:px-8 md:pb-8' : 'p-6 md:p-8'),
          flush && hasHeader && 'pt-4',
          bodyClassName,
        )}
      >
        {children}
      </div>
    </motion.section>
  );
});
