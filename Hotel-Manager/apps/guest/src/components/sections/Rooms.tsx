import { useState } from 'react';
import clsx from 'clsx';
import { Check, Plus, Minus } from 'lucide-react';
import { rooms, formatPrice } from '../../lib/content';
import type { Villa } from '../../lib/content';
import Img from '../ui/Img';
import Button from '../ui/Button';
import Divider from '../ui/Divider';
import Reveal from '../ui/Reveal';
import Carousel from '../ui/Carousel';
import { selectRoom } from '../../lib/events';

function VillaCard({ villa, index }: { villa: Villa; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="w-[80vw] flex-none sm:w-[58vw] md:w-[400px] lg:w-[420px]">
      <div
        className="card flex h-full animate-floaty flex-col overflow-hidden"
        style={{ animationDelay: `${index * 0.5}s` }}
      >
        <div className="relative">
          <Img
            src={villa.image}
            alt={villa.name}
            className="aspect-[4/5] w-full"
            imgClassName="transition-transform duration-[1.6s] ease-breath hover:scale-[1.05]"
          />
          <span className="absolute left-4 top-4 rounded-token border border-white/15 bg-[#06121a]/55 px-3 py-1 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-white backdrop-blur-md">
            {villa.type}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-6">
          <h3 className="font-serif text-2xl text-ink">{villa.name}</h3>
          <p className="mt-2 font-sans text-sm leading-relaxed text-muted">{villa.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs text-muted">
            <span>{villa.sizeSqm} m²</span>
            <span className="h-1 w-1 rounded-full bg-ink/20" aria-hidden />
            <span>Sleeps {villa.occupancy}</span>
          </div>

          {/* View villa — expands details in-page (no navigation away) */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-4 flex items-center gap-2 self-start font-sans text-sm font-medium text-ocean-300 transition-colors duration-300 hover:text-ocean-200"
          >
            {open ? <Minus size={15} /> : <Plus size={15} />}
            View villa
          </button>
          <div
            className={clsx(
              'grid overflow-hidden transition-all duration-500 ease-breath',
              open ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <ul className="min-h-0 space-y-2">
              {villa.amenities.map((am) => (
                <li key={am} className="flex items-center gap-2 font-sans text-sm text-muted">
                  <Check size={15} strokeWidth={1.6} className="shrink-0 text-palm-600" />
                  {am}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto pt-5">
            <Divider className="mb-5" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-serif text-2xl text-ink">{formatPrice(villa.pricePerNight)}</span>
                <span className="font-sans text-sm text-muted"> / night</span>
              </div>
              <Button href="#reserve" variant="primary" onClick={() => selectRoom(villa.id)}>
                Book Now
              </Button>
            </div>
          </div>
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

      <div className="mt-12">
        <Carousel ariaLabel="Villa types">
          {rooms.items.map((v, i) => (
            <VillaCard key={v.id} villa={v} index={i} />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
