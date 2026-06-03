import clsx from 'clsx';

const WORDS = ['Sun', 'Salt', 'Shade', 'Slow mornings', 'Sea breeze', 'Barefoot', 'Palm light'];

/**
 * Editorial running band of coastal words. The track holds two copies and
 * translates -50%, so the loop is seamless. Freezes (static) under
 * prefers-reduced-motion.
 */
export default function Marquee({ className }: { className?: string }) {
  const items = [...WORDS, ...WORDS];
  return (
    <div
      className={clsx('relative w-full overflow-hidden border-y border-ink/10 py-5', className)}
      aria-hidden
    >
      <div className="flex w-max animate-marquee items-center will-change-transform">
        {items.map((w, i) => (
          <span key={i} className="flex items-center">
            <span className="px-8 font-serif text-xl italic text-ink/70 md:text-2xl">{w}</span>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sunset-500/70" />
          </span>
        ))}
      </div>
    </div>
  );
}
