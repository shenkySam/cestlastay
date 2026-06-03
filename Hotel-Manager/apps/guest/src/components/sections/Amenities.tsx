import clsx from 'clsx';
import { Waves, Flower2, UtensilsCrossed, Sunrise } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { amenities } from '../../lib/content';
import type { Amenity } from '../../lib/content';
import Img from '../ui/Img';
import Reveal from '../ui/Reveal';
import Marquee from '../ui/Marquee';

const iconMap: Record<Amenity['icon'], LucideIcon> = {
  Waves,
  Flower2,
  UtensilsCrossed,
  Sunrise,
};

// Asymmetrical 12-col rhythm: 7/5, then 5/7.
const spans = ['md:col-span-7', 'md:col-span-5', 'md:col-span-5', 'md:col-span-7'];

export default function Amenities() {
  return (
    <section id="amenities" className="pb-24 pt-20 md:pb-28 md:pt-24">
      <Marquee className="mb-20 md:mb-28" />
      <div className="container-x">
        {/* Header */}
        <Reveal className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <p className="eyebrow mb-4">{amenities.eyebrow}</p>
            <h2 className="font-serif text-[clamp(2rem,4.4vw,3.4rem)] font-medium leading-[1.08] text-ink">
              {amenities.title}
            </h2>
          </div>
          <p className="font-sans leading-relaxed text-muted md:col-span-5">{amenities.intro}</p>
        </Reveal>

        {/* Asymmetrical feature grid */}
        <Reveal className="mt-14 grid items-start gap-6 md:grid-cols-12" stagger={0.12}>
          {amenities.items.map((a, i) => {
            const Icon = iconMap[a.icon];
            return (
              <div key={a.title} className={spans[i % spans.length]}>
                <article
                  style={{ animationDelay: `${i * 0.7}s` }}
                  className={clsx(
                    'group card h-full animate-floaty overflow-hidden',
                    i % 2 === 1 && 'md:mt-12', // grid-breaking stagger (right column dips)
                  )}
                >
                <div className="relative">
                  <Img
                    src={a.image}
                    alt={a.title}
                    className={clsx('w-full', i % 2 === 0 ? 'aspect-[16/10]' : 'aspect-[4/3]')}
                    imgClassName="transition-transform duration-[1.4s] ease-breath group-hover:scale-[1.06]"
                  />
                  <div className="pointer-events-none absolute inset-0 scrim-bottom opacity-90" aria-hidden />
                  <div className="absolute bottom-0 left-0 p-6">
                    <Icon size={26} strokeWidth={1.4} className="mb-3 text-white" />
                    <h3 className="font-serif text-2xl text-white md:text-3xl">{a.title}</h3>
                  </div>
                </div>
                  <p className="p-6 font-sans leading-relaxed text-muted">{a.description}</p>
                </article>
              </div>
            );
          })}
        </Reveal>

        {/* Quiet luxuries — hairline-separated strip */}
        <Reveal className="mt-12 flex flex-wrap items-center justify-center" delay={0.05}>
          {amenities.highlights.map((h, i) => (
            <span
              key={h}
              className={clsx(
                'px-5 py-1 font-sans text-sm text-muted',
                i < amenities.highlights.length - 1 && 'border-r border-ink/10',
              )}
            >
              {h}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
