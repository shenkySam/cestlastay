import { useLayoutEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { hero } from '../../lib/content';
import Button from '../ui/Button';
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
    <section id="top" className="relative flex min-h-[100svh] items-center">
      {/* soft scrim lifts the headline off the busy centre of the scene */}
      <div aria-hidden className="scrim-text pointer-events-none absolute inset-0" />

      <div ref={introRef} className="container-x relative w-full pb-28 pt-32">
        <div className="hero-stagger max-w-3xl">
          <p className="eyebrow mb-6 text-sunset-300">{hero.eyebrow}</p>
          <h1 className="whitespace-pre-line font-serif text-[clamp(2.7rem,7.4vw,5.6rem)] font-medium leading-[1.04] text-white">
            {hero.title}
          </h1>
          <p className="mt-7 max-w-xl font-sans text-lg leading-relaxed text-white/85">
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
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 transition-colors duration-300 hover:text-white"
      >
        <ChevronDown size={28} strokeWidth={1.5} className="animate-scrollcue" />
      </a>
    </section>
  );
}
