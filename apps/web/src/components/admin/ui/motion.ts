import type { Transition, Variants } from 'framer-motion';

/** The console's default spring: weighty, no linear easing. */
export const spring: Transition = { type: 'spring', stiffness: 100, damping: 20 };

/** Quicker spring for small UI (pills, popovers, dialogs). */
export const snappy: Transition = { type: 'spring', stiffness: 380, damping: 32 };

/** Overshoot spring for things that "pop" in (badges, the live island). */
export const pop: Transition = { type: 'spring', stiffness: 520, damping: 18 };

/** Parent variants: children using `riseItem`/`fadeItem` reveal as a waterfall. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

/** Child variants: rise + fade. Framer resets to `transform: none` at rest. */
export const riseItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: spring },
};

/** Child variants: fade only — use inside anything that hosts inline fixed overlays. */
export const fadeItem: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};
