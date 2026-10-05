import clsx from 'clsx';
import { brand } from '../../lib/content';

/**
 * Brand lockup — the exact logo emblem (/public/logo-mark.png, cropped from the
 * full artwork) paired with the wordmark in light type so it reads on the dark
 * theme. Set the emblem height via `className` (e.g. "h-10").
 */
export default function Logo({
  className,
  light = true,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img
        src="/logo-mark.png"
        alt=""
        aria-hidden
        draggable={false}
        className={clsx('w-auto select-none object-contain', className)}
      />
      <span
        className={clsx(
          'whitespace-nowrap font-script text-[2rem] font-semibold leading-none',
          light ? 'text-white' : 'text-ink',
        )}
      >
        {brand.name}
      </span>
    </span>
  );
}
