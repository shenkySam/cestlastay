import { useLayoutEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { hero } from '../../lib/content';
import Button from '../ui/Button';
import Img from '../ui/Img';
import { scrollToSection } from '../../hooks/useSmoothScroll';
import { gsap, prefersReducedMotion } from '../../lib/gsap';

export default function Hero() {
  const introRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.hero-stagger > *',
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, delay: 0.2 },
      );
    }, introRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="top" className="relative flex min-h-[100svh] items-end overflow-hidden">
      {/* Full-bleed photograph — the Matrimandir rising from the canopy */}
      <Img
        src={hero.image}
        alt={hero.imageAlt}
        className="absolute inset-0 h-full w-full"
        imgClassName="h-full w-full object-cover object-[center_24%]"
        priority
      />
      {/* Dark gradient lifts the headline off the photo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(28,18,10,0.30) 0%, rgba(28,18,10,0) 34%, rgba(28,18,10,0.55) 76%, rgba(28,18,10,0.82) 100%)',
        }}
      />

      <div ref={introRef} className="container-x relative w-full pb-24 pt-32">
        <div className="hero-stagger max-w-3xl">
          <p className="eyebrow mb-6 !text-ocean-200">{hero.eyebrow}</p>
          <h1 className="whitespace-pre-line font-serif text-[clamp(2.7rem,7.4vw,5.6rem)] font-medium leading-[1.04] text-white drop-shadow-[0_2px_24px_rgba(20,12,6,0.5)]">
            {hero.title}
          </h1>
          <p className="mt-7 max-w-xl font-sans text-lg leading-relaxed text-white/90 drop-shadow-[0_1px_14px_rgba(20,12,6,0.5)]">
            {hero.subtitle}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button href={hero.primaryCta.href} variant="primary" size="lg">
              {hero.primaryCta.label}
            </Button>
            <Button href={hero.secondaryCta.href} variant="outline-light" size="lg">
              {hero.secondaryCta.label}
            </Button>
          </div>
        </div>
      </div>

      <a
        href="#amenities"
        onClick={(e) => {
          e.preventDefault();
          scrollToSection('#amenities');
        }}
        aria-label="Scroll to explore"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/80 transition-colors duration-300 hover:text-white"
      >
        <ChevronDown size={28} strokeWidth={1.5} className="animate-scrollcue" />
      </a>
    </section>
  );
}
