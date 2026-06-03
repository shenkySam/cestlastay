import { useCallback, useEffect, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface CarouselProps {
  children: ReactNode;
  ariaLabel?: string;
}

/**
 * Horizontal, free-dragging carousel with momentum ("dampened glide").
 * Slides are provided by the consumer as flex children with their own widths.
 */
export default function Carousel({ children, ariaLabel }: CarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    dragFree: true, // inertia / momentum after release
    containScroll: 'trimSnaps',
    skipSnaps: false,
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect).on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect).off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

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
    'hover:border-ink/40 hover:bg-ink/[0.04] disabled:cursor-not-allowed ' +
    'disabled:opacity-30 focus:outline-none focus-visible:outline ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2';

  return (
    <div className="relative">
      <div
        className="cursor-grab overflow-hidden active:cursor-grabbing"
        ref={emblaRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className="flex gap-5 px-6 md:gap-7 md:px-10">{children}</div>
      </div>

      <div className="container-x mt-10 flex items-center gap-3">
        <button
          type="button"
          className={ctrl}
          onClick={scrollPrev}
          disabled={!canPrev}
          aria-label="Previous room"
        >
          <ArrowLeft size={18} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          className={ctrl}
          onClick={scrollNext}
          disabled={!canNext}
          aria-label="Next room"
        >
          <ArrowRight size={18} strokeWidth={1.5} />
        </button>
        <span className="ml-2 font-sans text-xs uppercase tracking-[0.18em] text-muted">
          Drag to explore
        </span>
      </div>
    </div>
  );
}
