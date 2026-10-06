import clsx from 'clsx';
import { initials } from './format';

const TINTS = [
  'bg-lagoon-100 text-lagoon-800',
  'bg-zinc-100 text-zinc-700',
  'bg-lagoon-200/70 text-lagoon-900',
  'bg-zinc-200/70 text-zinc-800',
  'bg-lagoon-50 text-lagoon-700',
];

const SIZE = {
  sm: 'size-7 text-[10px]',
  md: 'size-9 text-xs',
  lg: 'size-11 text-sm',
} as const;

interface AvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
}

/** Initials on a tint picked deterministically from the name. */
export function Avatar({ firstName, lastName, size = 'md', className }: AvatarProps) {
  const key = `${firstName ?? ''}${lastName ?? ''}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const tint = TINTS[Math.abs(hash) % TINTS.length];

  return (
    <span
      aria-hidden
      className={clsx(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-tight ring-1 ring-inset ring-zinc-950/5',
        SIZE[size],
        tint,
        className,
      )}
    >
      {initials(firstName, lastName)}
    </span>
  );
}
