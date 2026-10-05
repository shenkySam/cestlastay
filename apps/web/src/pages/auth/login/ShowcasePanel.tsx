import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LoginMode } from './ModeSwitch';

type Photo = 'heroMain' | 'balcony' | 'rooms' | 'heroImage';

// Optimized copies of the guest-site photos (apps/guest/public), 960 / 1440 wide.
const PHOTO_ALT: Record<Photo, string> = {
  heroMain: "Aerial view of C'est La Stay among palm trees at sunset",
  balcony: 'Balcony with a hammock and two chairs looking out over the treetops',
  rooms: 'Collage of the guest rooms, the garden path and a bathroom',
  heroImage: "The C'est La Stay guest house and garden path at dusk",
};

interface Slide {
  photo: Photo;
  title: string;
  text: string;
}

// What each side of the app does. Feature highlights, not testimonials —
// real guest reviews can replace these later.
const SLIDES: Record<LoginMode, Slide[]> = {
  guest: [
    {
      photo: 'heroMain',
      title: 'Your stay, in one place',
      text: 'See your booking, dates and rooms, even before you arrive.',
    },
    {
      photo: 'balcony',
      title: 'Ask for anything',
      text: 'Once you’ve checked in, request room service, laundry or help from your phone.',
    },
    {
      photo: 'rooms',
      title: 'Your bill as you go',
      text: 'Follow charges during your stay and pay securely by card.',
    },
    {
      photo: 'heroImage',
      title: 'Sign in your way',
      text: 'Continue with Google using the email you booked with, or use your booking number.',
    },
  ],
  staff: [
    {
      photo: 'heroImage',
      title: 'Front desk',
      text: 'Bookings, check-in and check-out, room by room.',
    },
    {
      photo: 'rooms',
      title: 'Rooms & housekeeping',
      text: 'Live room status and cleaning tasks for the whole house.',
    },
    {
      photo: 'balcony',
      title: 'Service queue',
      text: 'Guest requests arrive in real time, sorted by priority.',
    },
    {
      photo: 'heroMain',
      title: 'Reports',
      text: 'Occupancy, payments and guest ratings at a glance.',
    },
  ],
};

const AUTOPLAY_MS = 6000;
const SIZES = '(min-width: 1024px) 560px, 100vw';

function PhotoImage({ name, hidden }: { name: Photo; hidden: boolean }) {
  const srcSet = (ext: string) => `/login/${name}-960.${ext} 960w, /login/${name}-1440.${ext} 1440w`;
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet('avif')} sizes={SIZES} />
      <source type="image/webp" srcSet={srcSet('webp')} sizes={SIZES} />
      <img
        src={`/login/${name}-960.webp`}
        alt={hidden ? '' : PHOTO_ALT[name]}
        width={960}
        height={640}
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}

interface Props {
  mode: LoginMode;
  /** Auto-advance (off for reduced motion / touch-only pointers) */
  autoplay: boolean;
}

/**
 * Photo panel with a glass caption. Feature highlights for the current mode,
 * with arrows, dots and a 6s auto-advance that pauses on hover or focus. Only
 * the current, outgoing (for the crossfade) and next photos are in the DOM.
 */
export function ShowcasePanel({ mode, autoplay }: Props) {
  const slides = SLIDES[mode];
  const count = slides.length;
  const [{ index, outgoing }, setSlide] = useState<{ index: number; outgoing: Photo | null }>({
    index: 0,
    outgoing: null,
  });
  const [paused, setPaused] = useState(false);

  // Switching mode restarts at that mode's first highlight, crossfading from the current photo
  const [shownMode, setShownMode] = useState(mode);
  if (shownMode !== mode) {
    setShownMode(mode);
    setSlide({ index: 0, outgoing: SLIDES[shownMode][index].photo });
  }

  const go = (to: number) =>
    setSlide((s) => ({ index: (to + count) % count, outgoing: slides[s.index].photo }));

  useEffect(() => {
    if (!autoplay || paused) return;
    const id = window.setTimeout(
      () => setSlide((s) => ({ index: (s.index + 1) % count, outgoing: slides[s.index].photo })),
      AUTOPLAY_MS,
    );
    return () => window.clearTimeout(id);
  }, [autoplay, paused, index, count, slides]);

  const current = slides[index];
  const next = slides[(index + 1) % count].photo;
  const rendered = [...new Set([outgoing, current.photo, next])].filter((p): p is Photo => !!p);

  return (
    <section
      className="login-showcase"
      aria-roledescription="carousel"
      aria-label={mode === 'guest' ? 'What you can do as a guest' : 'What the staff app does'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="login-photo">
        <div className="login-photo__layer">
          {rendered.map((photo) => (
            <div
              key={photo}
              className={clsx(
                'login-slide',
                photo === current.photo ? 'is-current' : photo === outgoing && 'is-previous',
              )}
              aria-hidden={photo !== current.photo}
            >
              <PhotoImage name={photo} hidden={photo !== current.photo} />
            </div>
          ))}
        </div>
        <div className="login-photo__sheen" aria-hidden="true" />
      </div>

      <div className="login-caption">
        <div aria-live={autoplay && !paused ? 'off' : 'polite'}>
          <div
            key={`${mode}-${index}`}
            className="login-caption__text"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}`}
          >
            <p className="hidden text-[11px] font-medium uppercase tracking-[0.22em] text-cream/75 lg:block">
              {mode === 'guest' ? 'For guests' : 'For the team'} ·{' '}
              {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </p>
            <h2 className="font-cormorant text-xl font-semibold leading-tight text-cream lg:mt-1.5 lg:text-[28px]">
              {current.title}
            </h2>
            <p className="mt-1 hidden text-sm leading-relaxed text-cream/85 sm:block">{current.text}</p>
          </div>
        </div>

        <div className="mt-4 hidden items-center justify-between lg:flex">
          <div className="flex items-center">
            {slides.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show highlight ${i + 1}: ${s.title}`}
                aria-current={i === index}
                className="group p-1.5 focus:outline-none"
              >
                <span
                  className={clsx(
                    'block h-1.5 rounded-full transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-cream',
                    i === index ? 'w-6 bg-cream' : 'w-1.5 bg-cream/45 group-hover:bg-cream/70',
                  )}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {[
              { label: 'Previous highlight', Icon: ChevronLeft, to: index - 1 },
              { label: 'Next highlight', Icon: ChevronRight, to: index + 1 },
            ].map(({ label, Icon, to }) => (
              <button
                key={label}
                type="button"
                onClick={() => go(to)}
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/30 bg-cream/10
                           text-cream transition hover:bg-cream/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cream"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
