import clsx from 'clsx';
import { amenities } from '../../lib/content';
import Reveal from '../ui/Reveal';
import Marquee from '../ui/Marquee';
import ClothAmenities from '../scenes/ClothAmenities';

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
          <p className="font-sans leading-relaxed copy-on-scene md:col-span-5">{amenities.intro}</p>
        </Reveal>
      </div>

      {/* Scroll-driven 3D cloth experience (falls back to a static grid under
          reduced-motion / no-WebGL — see ClothAmenities) */}
      <ClothAmenities items={amenities.items} />

      <div className="container-x">
        {/* Quiet luxuries — hairline-separated strip */}
        <Reveal className="mt-12 flex flex-wrap items-center justify-center" delay={0.05}>
          {amenities.highlights.map((h, i) => (
            <span
              key={h}
              className={clsx(
                'px-5 py-1 font-sans text-sm text-white',
                i < amenities.highlights.length - 1 && 'border-r border-white/20',
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
