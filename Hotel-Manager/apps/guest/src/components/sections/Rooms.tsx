import clsx from 'clsx';
import { Star, Award } from 'lucide-react';
import { rooms } from '../../lib/content';
import type { Villa } from '../../lib/content';
import Img from '../ui/Img';
import Button from '../ui/Button';
import Reveal from '../ui/Reveal';
import Carousel from '../ui/Carousel';
import { selectRoom } from '../../lib/events';

const pill =
  'inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-sans text-xs text-white backdrop-blur-md';

/**
 * Tall "vertical capsule" photo card. The huge radius rounds the top and bottom
 * into domes, so the overlaid copy is centred and lifted clear of the curves.
 * Only the carousel's centred (active) card reveals its full detail + CTA;
 * neighbours fade to a quiet, titled photo.
 */
function VillaCard({ villa, isActive }: { villa: Villa; isActive: boolean }) {
  return (
    <article
      className={clsx(
        'group relative aspect-[3/4] overflow-hidden rounded-[9999px] shadow-soft transition-shadow duration-500 ease-breath',
        isActive && 'shadow-lift',
      )}
    >
      <Img
        src={villa.image}
        alt={villa.name}
        className="absolute inset-0 h-full w-full"
        imgClassName="transition-transform duration-[1.6s] ease-breath group-hover:scale-[1.05]"
      />
      {/* Dark gradient so the overlaid copy stays legible over any photo */}
      <div className="pointer-events-none absolute inset-0 scrim-bottom" aria-hidden />

      {/* Centred overlay, padded up so it clears the capsule's curved bottom */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-10 pb-[15%] text-center">
        <h3 className="font-serif text-2xl text-white md:text-[1.7rem]">{villa.name}</h3>

        {/* Detail + CTA — revealed only on the centred card */}
        <div
          className={clsx(
            'flex flex-col items-center transition-opacity duration-500 ease-breath',
            isActive ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <p className="mt-2 line-clamp-2 max-w-[15rem] font-sans text-sm leading-relaxed text-white/85">
            {villa.description}
          </p>

          {/* Badge pills — a rating OR a tag, plus the minimum night stay */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {villa.rating != null && (
              <span className={pill}>
                {villa.rating.toFixed(1)}
                <span className="flex items-center gap-0.5" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={11} strokeWidth={0} className="fill-current" />
                  ))}
                </span>
              </span>
            )}
            {villa.tag && (
              <span className={pill}>
                <Award size={13} strokeWidth={1.6} aria-hidden />
                {villa.tag}
              </span>
            )}
            {villa.minNights != null && (
              <span className={pill}>{villa.minNights} Night Stay</span>
            )}
          </div>

          <Button
            href="#reserve"
            variant="light"
            className="mt-5"
            onClick={() => selectRoom(villa.id)}
          >
            Reserve now
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function Rooms() {
  return (
    <section id="rooms" className="section">
      <div className="container-x">
        <Reveal className="max-w-2xl">
          <p className="eyebrow mb-4">{rooms.eyebrow}</p>
          <h2 className="font-serif text-[clamp(2rem,4.4vw,3.4rem)] font-medium leading-[1.08] text-ink">
            {rooms.title}
          </h2>
          <p className="mt-5 font-sans leading-relaxed copy-on-scene">{rooms.intro}</p>
        </Reveal>
      </div>

      {/* Coverflow lives in the content column so cards stay a sane size on wide screens */}
      <Reveal className="container-x mt-14">
        <Carousel
          items={rooms.items}
          getKey={(v) => v.id}
          ariaLabel="Villas"
          renderItem={(v, isActive) => <VillaCard villa={v} isActive={isActive} />}
        />
      </Reveal>
    </section>
  );
}
