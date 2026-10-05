import clsx from 'clsx';

/** Hairline-thin, low-opacity divider — mimics a paper-panel seam. */
export default function Divider({ className }: { className?: string }) {
  return <hr className={clsx('divider', className)} />;
}
