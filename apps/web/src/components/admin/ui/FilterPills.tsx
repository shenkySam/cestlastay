import clsx from 'clsx';
import { SegmentedControl, SegmentOption } from './SegmentedControl';

interface FilterPillsProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  'aria-label'?: string;
  className?: string;
}

/**
 * Filter / tab row (status pills, role pills, page tabs). Same sliding-pill
 * control, but it scrolls horizontally on narrow screens instead of wrapping.
 */
export function FilterPills<T extends string | number>({ className, ...props }: FilterPillsProps<T>) {
  return (
    <div className={clsx('relative -mx-1 max-w-full overflow-x-auto px-1 py-0.5 [scrollbar-width:none]', className)}>
      <SegmentedControl size="md" {...props} />
    </div>
  );
}
