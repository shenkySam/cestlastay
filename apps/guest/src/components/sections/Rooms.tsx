import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Star, Award, MapPin } from 'lucide-react';
import { rooms, location } from '../../lib/content';
import type { Villa } from '../../lib/content';
import Img from '../ui/Img';
import Button from '../ui/Button';
import Reveal from '../ui/Reveal';
import Carousel from '../ui/Carousel';
import { selectRoom } from '../../lib/events';
import { getRoomCategories, isBookingApiEnabled } from '../../lib/booking';
import type { IRoomCategory } from '../../types/booking.types';

const pill =
  'inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-sans text-xs text-white backdrop-blur-md';

/**
 * A stay card merged with its live backend category (when the booking API is on
 * and a category named like the stay exists). `reserveId` is the value passed to
 * the reservation form: a real IRoomCategory.id when matched, else the demo id.
 */
type DisplayVilla = Villa & { reserveId: string };

function mergeVillas(items: Villa[], categories: IRoomCategory[]): DisplayVilla[] {
  if (!categories.length) return items.map((v) => ({ ...v, reserveId: v.id }));
  return items.map((v) => {
    const key = (v.categoryKey ?? v.name).trim().toLowerCase();
    const cat = categories.find((c) => c.name.trim().toLowerCase() === key);
    if (!cat) return { ...v, reserveId: v.id };
    return {
      ...v,
      name: cat.name,
      description: cat.description ?? v.description,
      // basePrice serializes as a string (Prisma Decimal) — coerce to a number.
      pricePerNight: Number(cat.basePrice) || v.pricePerNight,
      reserveId: cat.id,
    };
  });
}

/**
 * Tall "vertical capsule" photo card. The huge radius rounds the top and bottom
 * into domes, so the overlaid copy is centred and lifted clear of the curves.
 * Only the carousel's centred (active) card reveals its full detail + CTA;
 * neighbours fade to a quiet, titled photo.
 */
function VillaCard({ villa, isActive }: { villa: DisplayVilla; isActive: boolean }) {
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

      {/* Map pin — top-right, opens the property location in Google Maps */}
      <a
        href={location.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label={`View location on map — ${location.label}`}
        title="View on map"
        className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/30"
      >
        <MapPin size={16} strokeWidth={1.8} aria-hidden />
      </a>

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
            onClick={() => selectRoom(villa.reserveId)}
          >
            Reserve now
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function Rooms() {
  // Live room categories (only when the booking API is on). Cards fall back to
  // the hardcoded content until/unless a category named like the stay exists.
  const [categories, setCategories] = useState<IRoomCategory[]>([]);

  useEffect(() => {
    if (!isBookingApiEnabled) return;
    let active = true;
    getRoomCategories()
      .then((cats) => active && setCategories(cats))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const items = mergeVillas(rooms.items, categories);

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
          items={items}
          getKey={(v) => v.id}
          ariaLabel="Villas"
          renderItem={(v, isActive) => <VillaCard villa={v} isActive={isActive} />}
        />
      </Reveal>
    </section>
  );
}
