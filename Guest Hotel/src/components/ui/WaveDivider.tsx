import clsx from 'clsx';

interface WaveDividerProps {
  /** fill colour — set to the NEXT section's background so it transitions in */
  fill?: string;
  /** flip vertically (wave dips down instead of up) */
  flip?: boolean;
  className?: string;
  /** layer a gently drifting foam wave on top (set false to disable motion) */
  animated?: boolean;
}

/**
 * Full-bleed wave that bridges two sections — echoes the logo's ocean.
 * Place at the bottom of a section; `fill` should match the section below.
 */
export default function WaveDivider({
  fill = '#faf7f1',
  flip = false,
  className,
  animated = true,
}: WaveDividerProps) {
  return (
    <div
      aria-hidden
      className={clsx(
        'pointer-events-none relative w-full overflow-hidden leading-[0]',
        flip && 'rotate-180',
        className,
      )}
    >
      {/* drifting foam layer (double-width so the loop is seamless) */}
      {animated && (
        <svg
          viewBox="0 0 2880 120"
          preserveAspectRatio="none"
          className="absolute inset-0 h-[56px] w-[200%] animate-wave-slow opacity-70 md:h-[88px]"
        >
          <path
            d="M0,70 C240,110 480,20 720,50 C960,80 1200,118 1440,78 C1680,40 1920,108 2160,72 C2400,44 2640,104 2880,70 L2880,120 L0,120 Z"
            fill={fill}
          />
        </svg>
      )}
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="relative h-[56px] w-full md:h-[88px]"
      >
        <path
          d="M0,64 C240,116 480,12 720,44 C960,76 1200,120 1440,72 L1440,120 L0,120 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}
