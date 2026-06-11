import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { prefersReducedMotion } from '../../lib/gsap';

type EmblaApi = NonNullable<ReturnType<typeof useEmblaCarousel>[1]>;

interface CarouselProps<T> {
  items: T[];
  getKey: (item: T) => string;
  /** `isActive` is true for the slide currently snapped to the centre. */
  renderItem: (item: T, isActive: boolean) => ReactNode;
  ariaLabel?: string;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

// How hard neighbours shrink/fade away from the centre. Higher = stronger falloff.
const TWEEN_FACTOR_BASE = 0.52;
// How far off-centre cards get pulled back toward the middle (% of their own
// width) — this is what fans the deck and tucks neighbours behind the centre
// card instead of letting them get clipped at the container edge.
const PULL_FACTOR = 78;

/**
 * Center-focus "coverflow" carousel. The snapped card sits big and sharp in the
 * middle; neighbours scale down, dim, and drop a touch — so dragging feels like
 * cards arcing up into the spotlight, then back down to the sides.
 *
 * Generic: the consumer supplies the data + a `renderItem` that styles each card
 * and reacts to `isActive` (e.g. revealing details only on the centred card).
 */
export default function Carousel<T>({ items, getKey, renderItem, ariaLabel }: CarouselProps<T>) {
  const reduced = prefersReducedMotion();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    loop: true,
    containScroll: false,
    skipSnaps: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tweenFactor = useRef(0);
  const tweenNodes = useRef<HTMLElement[]>([]);
  const slideCells = useRef<HTMLElement[]>([]);

  const setTweenNodes = useCallback((api: EmblaApi) => {
    slideCells.current = api.slideNodes() as HTMLElement[];
    tweenNodes.current = slideCells.current.map(
      (slide) => slide.querySelector('[data-coverflow-tween]') as HTMLElement,
    );
  }, []);

  const setTweenFactor = useCallback((api: EmblaApi) => {
    tweenFactor.current = TWEEN_FACTOR_BASE * api.scrollSnapList().length;
  }, []);

  // Translate each slide's distance-from-centre into the deck fan: pull toward
  // the middle (overlap), drop behind the centre card (z-index), shrink, dim.
  // All slides update every pass — with overlap they're all effectively visible.
  const tween = useCallback((api: EmblaApi) => {
    const engine = api.internalEngine();
    const scrollProgress = api.scrollProgress();

    api.scrollSnapList().forEach((scrollSnap, snapIndex) => {
      let diff = scrollSnap - scrollProgress;
      const slidesInSnap = engine.slideRegistry[snapIndex];

      slidesInSnap.forEach((slideIndex) => {
        // Account for the wrap-around copies when looping.
        if (engine.options.loop) {
          engine.slideLooper.loopPoints.forEach((loopItem) => {
            const target = loopItem.target();
            if (slideIndex === loopItem.index && target !== 0) {
              const sign = Math.sign(target);
              if (sign === -1) diff = scrollSnap - (1 + scrollProgress);
              if (sign === 1) diff = scrollSnap + (1 - scrollProgress);
            }
          });
        }

        const node = tweenNodes.current[slideIndex];
        if (!node) return;

        const t = clamp(1 - Math.abs(diff) * tweenFactor.current, 0, 1);
        const scale = 0.8 + t * 0.2; // 0.80 → 1.00 at centre
        const opacity = 0.55 + t * 0.45; // 0.55 → 1.00 at centre
        const lift = (1 - t) * 14; // gentle sink as a card leaves the centre
        const pull = -Math.sign(diff) * (1 - t) * PULL_FACTOR; // % of own width

        node.style.transform = `translate3d(${pull}%, ${lift}px, 0) scale(${scale})`;
        node.style.opacity = String(opacity);

        // Centre card on top, each step away one layer further back.
        const cell = slideCells.current[slideIndex];
        if (cell) cell.style.zIndex = String(21 - Math.round(clamp(Math.abs(diff), 0, 1) * 20));
      });
    });
  }, []);

  const onSelect = useCallback((api: EmblaApi) => {
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    onSelect(emblaApi);
    emblaApi.on('select', onSelect).on('reInit', onSelect);

    if (!reduced) {
      setTweenNodes(emblaApi);
      setTweenFactor(emblaApi);
      tween(emblaApi);
      emblaApi
        .on('reInit', setTweenNodes)
        .on('reInit', setTweenFactor)
        .on('reInit', tween)
        .on('scroll', tween)
        .on('slideFocus', tween);
    }

    return () => {
      emblaApi.off('select', onSelect).off('reInit', onSelect);
      if (!reduced) {
        emblaApi
          .off('reInit', setTweenNodes)
          .off('reInit', setTweenFactor)
          .off('reInit', tween)
          .off('scroll', tween)
          .off('slideFocus', tween);
      }
    };
  }, [emblaApi, reduced, onSelect, setTweenNodes, setTweenFactor, tween]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollNext();
    }
  };

  const ctrl =
    'inline-flex h-12 w-12 items-center justify-center rounded-full border ' +
    'border-ink/20 text-ink transition-all duration-300 ease-breath ' +
    'hover:border-ink/40 hover:bg-ink/[0.04] focus:outline-none ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

  return (
    <div className="relative">
      <div
        className="cursor-grab overflow-hidden py-6 active:cursor-grabbing md:py-10"
        ref={emblaRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className="flex touch-pan-y">
          {items.map((item, i) => (
            <div
              key={getKey(item)}
              className="min-w-0 flex-[0_0_80%] px-2 sm:flex-[0_0_55%] md:flex-[0_0_34%] md:px-3 lg:flex-[0_0_30%]"
              role="group"
              aria-roledescription="slide"
            >
              <div data-coverflow-tween className="h-full will-change-transform">
                {renderItem(item, i === selectedIndex)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls — arrows, progress dots, hint */}
      <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-4">
        <div className="flex items-center gap-3">
          <button type="button" className={ctrl} onClick={scrollPrev} aria-label="Previous villa">
            <ArrowLeft size={18} strokeWidth={1.5} />
          </button>
          <button type="button" className={ctrl} onClick={scrollNext} aria-label="Next villa">
            <ArrowRight size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {items.map((item, i) => (
            <button
              key={getKey(item)}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Go to villa ${i + 1}`}
              aria-current={i === selectedIndex}
              className={
                'h-2 rounded-full transition-all duration-300 ease-breath ' +
                (i === selectedIndex ? 'w-7 bg-ink' : 'w-2 bg-ink/30 hover:bg-ink/50')
              }
            />
          ))}
        </div>

        <span className="ml-auto font-sans text-xs uppercase tracking-[0.18em] text-muted">
          Drag to explore
        </span>
      </div>
    </div>
  );
}
