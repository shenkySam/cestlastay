import { Star, Award } from 'lucide-react';
import { rooms } from '../../lib/content';
import type { Villa } from '../../lib/content';
import Img from '../ui/Img';
import Button from '../ui/Button';
import Reveal from '../ui/Reveal';
import { selectRoom } from '../../lib/events';

const pill =
  'inline-flex items-center gap-1.5 rounded-token bg-white/15 px-3 py-1 font-sans text-xs text-white backdrop-blur-md';

function VillaCard({ villa, index }: { villa: Villa; index: number }) {
  return (
    // Outer cell is the Reveal stagger target (GSAP animates its transform);
    // the floaty bob lives on the inner article so the two never fight over transform.
    <div>
      <article
        style={{ animationDelay: `${index * 0.5}s` }}
        className="group relative animate-floaty overflow-hidden rounded-[20px] shadow-soft transition-shadow duration-500 ease-breath hover:shadow-lift"
      >
        <Img
          src={villa.image}
          alt={villa.name}
          className="aspect-[4/5] w-full"
          imgClassName="transition-transform duration-[1.6s] ease-breath group-hover:scale-[1.05]"
        />
        {/* Dark gradient so the overlaid copy stays legible over any photo */}
        <div className="pointer-events-none absolute inset-0 scrim-bottom" aria-hidden />

        <div className="absolute inset-x-0 bottom-0 p-6">
          <h3 className="font-serif text-2xl text-white">{villa.name}</h3>
          <p className="mt-2 line-clamp-3 font-sans text-sm leading-relaxed text-white/85">
            {villa.description}
          </p>

          {/* Badge pills — a rating OR a tag, plus the minimum night stay */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
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
            className="mt-5 w-full"
            onClick={() => selectRoom(villa.id)}
          >
            Reserve now
          </Button>
        </div>
      </article>
    </div>
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

        <Reveal className="mt-12 grid grid-cols-1 gap-7 sm:grid-cols-2" stagger={0.12}>
          {rooms.items.map((v, i) => (
            <VillaCard key={v.id} villa={v} index={i} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
