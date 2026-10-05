/**
 * ──────────────────────────────────────────────────────────────────────────
 *  SITE CONTENT  —  the single no-code editing surface.
 *  C'EST LA STAY · EARTHEN — an Auroville hostel & guest house.
 *  Edit copy, prices, room data, journeys, contact details and image paths
 *  here. (Brand colours live in tailwind.config.js; fonts in index.html.)
 * ──────────────────────────────────────────────────────────────────────────
 */

// Real photography lives in /public — drop more files there and reference them
// as e.g. "/balcony.png". Reuse is fine for now; swap in per-room shots later.

/** Price formatter — Indian Rupee, Indian digit grouping. */
export const formatPrice = (n: number): string => `₹${n.toLocaleString('en-IN')}`;

export interface NavLink {
  label: string;
  href: string;
}

export interface Amenity {
  /** lucide-react icon name — see ClothAmenities.tsx icon map (fixed set) */
  icon: 'Waves' | 'Flower2' | 'UtensilsCrossed' | 'Sunrise';
  title: string;
  description: string;
  image: string;
}

export interface Villa {
  id: string;
  name: string;
  /**
   * Links this card to a backend RoomCategory by its `name`. When the booking
   * API is on and a category with this name exists, the card's name, description
   * and price come live from the admin (GET /rooms/categories). Defaults to the
   * card's own `name` when omitted — so creating a category named exactly like a
   * stay is all it takes to make its pricing admin-editable.
   */
  categoryKey?: string;
  type: string;
  description: string;
  pricePerNight: number;
  sizeSqm: number;
  occupancy: number;
  amenities: string[];
  image: string;
  /** showcase badges — a rating OR a tag, plus a minimum-night-stay pill */
  rating?: number;
  tag?: string;
  minNights?: number;
}

export interface Package {
  id: string;
  name: string;
  badge: string;
  description: string;
  includes: string[];
  priceFrom: number;
  nights: number;
  image: string;
  featured?: boolean;
}

export interface Stat {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
}

export const brand = {
  name: "C'est La Stay",
  tagline: 'an earthen retreat in the city of dawn',
  location: 'Auroville, Tamil Nadu',
};

export const nav: NavLink[] = [
  { label: 'Experiences', href: '#amenities' },
  { label: 'Stays', href: '#rooms' },
  { label: 'Journeys', href: '#packages' },
  { label: 'Reserve', href: '#reserve' },
];

export const hero = {
  eyebrow: 'Auroville · The City of Dawn',
  // Use \n to control line breaks in the display heading.
  title: 'Where the earth\nremembers the sun.',
  subtitle:
    'A boutique earthen hostel of clay, banyan shade and slow mornings — minutes from the Matrimandir, on the edge of the Auroville forest.',
  primaryCta: { label: 'Reserve Your Stay', href: '#reserve' },
  secondaryCta: { label: 'Explore the Rooms', href: '#rooms' },
  image: '/heroMain.png',
  imageAlt:
    'Aerial of C\u2019est la Stay at sunrise, the Matrimandir rising from the palm canopy beyond',
};

export const stats: Stat[] = [
  { value: 5, label: 'Rooms in one house' },
  { value: 3, suffix: ' katha', label: 'Garden grounds' },
  { value: 4.9, label: 'Guest rating' },
  { value: 10, suffix: ' min', label: 'To the Matrimandir' },
];

export const amenities = {
  eyebrow: 'Days & Evenings',
  title: 'Made of small ceremonies',
  intro:
    'Nothing superfluous — just forest air, warm light, and space to exhale. Every hour is composed for ease.',
  items: [
    {
      icon: 'Sunrise',
      title: 'Matrimandir at Dawn',
      description:
        'A guided sunrise walk to the golden sphere, before the heat arrives and the township stirs.',
      image: '/heroImage.png',
    },
    {
      icon: 'Waves',
      title: 'The Coast, Ten Minutes Away',
      description:
        'The quiet beaches of the Bay of Bengal — for an early swim or a long, salt-aired afternoon.',
      image: '/heroMain.png',
    },
    {
      icon: 'UtensilsCrossed',
      title: 'Farm-Table Dining',
      description:
        'Long-table meals from the township\u2019s organic growers, cooked over a slow flame in the courtyard.',
      image: '/rooms.png',
    },
    {
      icon: 'Flower2',
      title: 'Sound Healing & Yoga',
      description:
        'Sunrise stretches on the deck and evening resonance sessions beneath the open sky.',
      image: '/balcony.png',
    },
  ] as Amenity[],
  highlights: [
    'Sunrise yoga deck',
    'Bicycles to the dome',
    'Organic kitchen garden',
    'Forest walks',
    'Lantern-lit paths',
    'Late checkout on request',
  ],
};

export const rooms = {
  eyebrow: 'The Rooms',
  title: 'Five rooms in one earthen house',
  intro:
    'Three hostel rooms on the ground floor, two family rooms above — all hand-finished in local clay and reclaimed teak, each opening to the garden.',
  items: [
    {
      id: 'banyan-bunk',
      name: 'Banyan Bunk',
      type: 'Ground floor · Hostel',
      description:
        'A bright bunk room under the banyan, with a shared bath and a door onto the garden.',
      pricePerNight: 1400,
      sizeSqm: 16,
      occupancy: 4,
      amenities: ['4-bed dorm', 'Shared bath', 'Reading light & locker', 'Garden access'],
      image: '/rooms.png',
      tag: 'Hostel',
      minNights: 1,
    },
    {
      id: 'canopy-dorm',
      name: 'Canopy Dorm Bed',
      type: 'Ground floor · Hostel',
      description:
        'A single bed in a breezy mixed dorm — the easy, sociable way to stay in Auroville.',
      pricePerNight: 1200,
      sizeSqm: 20,
      occupancy: 6,
      amenities: ['Mixed dorm', 'Shared bath', 'Linens included', 'Ceiling fan'],
      image: '/heroImage.png',
      tag: 'Hostel',
      minNights: 1,
    },
    {
      id: 'courtyard-room',
      name: 'Courtyard Hostel Room',
      type: 'Ground floor · Hostel (private)',
      description:
        'A private clay-walled room off the courtyard — hostel ease, with a door you can close.',
      pricePerNight: 2400,
      sizeSqm: 24,
      occupancy: 2,
      amenities: ['Private room', 'Shared bath', 'Courtyard view', 'King bed'],
      image: '/heroMain.png',
      rating: 4.7,
      minNights: 1,
    },
    {
      id: 'matrimandir-family',
      name: 'Matrimandir Family Room',
      type: 'First floor · Family',
      description:
        'An upstairs room with a private bath and a balcony framing the golden dome at dusk.',
      pricePerNight: 5500,
      sizeSqm: 34,
      occupancy: 3,
      amenities: ['Private bath', 'Dome-view balcony', 'King + single', 'Hammock'],
      image: '/balcony.png',
      tag: 'Family favourite',
      minNights: 2,
    },
    {
      id: 'sunrise-suite',
      name: 'Sunrise Family Suite',
      type: 'First floor · Family',
      description:
        'The top suite — two bedrooms, a private bath, and a hammock balcony made for first light.',
      pricePerNight: 6800,
      sizeSqm: 46,
      occupancy: 4,
      amenities: ['Two bedrooms', 'Private bath', 'Hammock balcony', 'Sunrise view'],
      image: '/balcony.png',
      rating: 4.9,
      minNights: 2,
    },
  ] as Villa[],
};

export const packages = {
  eyebrow: 'Stay a Little Longer',
  title: 'Unhurried Auroville journeys',
  intro:
    'Multi-night stays composed end-to-end — arrive, kick off your shoes, and let the forest set the pace.',
  items: [
    {
      id: 'weekend-forest',
      name: 'Weekend in the Forest',
      badge: '2 nights',
      description:
        'A quick reset under the canopy — sunrise yoga, long lunches, and nowhere to be.',
      includes: [
        'Daily breakfast in the courtyard',
        'One guided forest walk',
        'Sunset farm-table dinner',
        'Late checkout',
      ],
      priceFrom: 4900,
      nights: 2,
      image: '/heroImage.png',
    },
    {
      id: 'dawn-retreat',
      name: 'The Dawn Retreat',
      badge: 'Most loved',
      description:
        'Three days tuned to the light — the golden dome at dawn, resonance at dusk.',
      includes: [
        'Family room upgrade',
        'Matrimandir sunrise visit',
        'Evening sound healing',
        'Couples spa ritual',
      ],
      priceFrom: 12900,
      nights: 3,
      image: '/heroMain.png',
      featured: true,
    },
    {
      id: 'slow-living-week',
      name: 'Slow Living Week',
      badge: '5 nights',
      description:
        'For the deep exhale — five unhurried days in the rhythm of the township.',
      includes: [
        'Daily yoga & meditation',
        'Organic kitchen-garden table',
        'Bicycle & coast day',
        'Sunrise dome walk',
      ],
      priceFrom: 21900,
      nights: 5,
      image: '/balcony.png',
    },
  ] as Package[],
};

export const reserve = {
  eyebrow: 'Frictionless Action',
  title: 'Reserve your stay',
  intro:
    'Tell us when, and we\u2019ll prepare the rest. No accounts, no clutter — just a warm welcome and cold hibiscus tea.',
  reassurance: [
    'Free cancellation up to 7 days before arrival',
    'No prepayment required to reserve',
    'A real host replies within 24 hours',
  ],
};

export const footer = {
  closingEyebrow: 'Your room is waiting',
  closingTitle: 'Come live the dawn.',
  closingText: 'The forest keeps its own time. Reserve a few days beside it.',
  contact: {
    address: '10, Auroville Rd, Edayanchavadi, Auroville, Tamil Nadu 605101, India',
    phone: '+91 413 262 0000',
    email: 'stay@cestlastay.com',
  },
  hours: [
    { label: 'Check-in', value: 'from 14:00' },
    { label: 'Check-out', value: 'until 11:00' },
    { label: 'Reception', value: '24 hours' },
  ],
  // In-page anchors only — single, continuous experience.
  social: ['Instagram', 'Journal', 'Newsletter'],
};

/** Property location — drives the map-pin links on the stay cards. */
export const location = {
  lat: 11.999652,
  lng: 79.800917,
  label: footer.contact.address,
  mapsUrl: 'https://www.google.com/maps?q=11.999652,79.800917',
};
