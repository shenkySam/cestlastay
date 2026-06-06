/**
 * ──────────────────────────────────────────────────────────────────────────
 *  SITE CONTENT  —  the single no-code editing surface.
 *  Edit copy, prices, villa data, packages, contact details and image paths
 *  here. (Brand colours live in tailwind.config.js; fonts in index.html.)
 * ──────────────────────────────────────────────────────────────────────────
 */

// ⇩ SWAP IMAGE SOURCES HERE ⇩
// Dev placeholders use Unsplash. Replace with your own photography by dropping
// files into /public/assets and using e.g. "/assets/hero.jpg" instead of u(...).
const u = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Price formatter — Indian Rupee, Indian digit grouping. */
export const formatPrice = (n: number): string => `₹${n.toLocaleString('en-IN')}`;

export interface NavLink {
  label: string;
  href: string;
}

export interface Amenity {
  /** lucide-react icon name — see Amenities.tsx icon map */
  icon: 'Waves' | 'Flower2' | 'UtensilsCrossed' | 'Sunrise';
  title: string;
  description: string;
  image: string;
}

export interface Villa {
  id: string;
  name: string;
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
  tagline: 'beachfront living, the way it should be',
  location: 'Auroville Coast, Tamil Nadu',
};

export const nav: NavLink[] = [
  { label: 'The Coast', href: '#amenities' },
  { label: 'Villas', href: '#rooms' },
  { label: 'Offers', href: '#packages' },
  { label: 'Reserve', href: '#reserve' },
];

export const hero = {
  eyebrow: 'Beachfront on the Coromandel Coast',
  // Use \n to control line breaks in the display heading.
  title: 'Where the day\nslows to the tide.',
  subtitle:
    'A sun-warmed retreat of palm shade, open water, and unhurried mornings — moments from the Bay of Bengal at Auroville.',
  primaryCta: { label: 'Reserve Your Stay', href: '#reserve' },
  secondaryCta: { label: 'Browse Villas', href: '#rooms' },
  image: u('1507525428034-b723cf961d3e', 2000),
  imageAlt: 'Turquoise sea meeting a soft sand beach at golden hour',
};

export const stats: Stat[] = [
  { value: 14, label: 'Private villas' },
  { value: 300, suffix: 'm', label: 'Of beachfront' },
  { value: 4.9, label: 'Guest rating' },
  { value: 25, suffix: 'k+', label: 'Happy guests' },
];

export const amenities = {
  eyebrow: 'Comfort & Indulgence',
  title: 'Salt air, slow days',
  intro:
    'Nothing superfluous — just sea breeze, warm light, and space to exhale. Every corner is composed for ease.',
  items: [
    {
      icon: 'Waves',
      title: 'Beachfront & Infinity Pool',
      description:
        'A heated infinity pool that spills toward the horizon, steps of warm sand, and loungers under the palms.',
      image: u('1582719478250-c89cae4dc85b', 1200),
    },
    {
      icon: 'Flower2',
      title: 'Coastal Spa & Wellness',
      description:
        'Sea-salt scrubs, coconut-oil rituals, and open-air treatment cabanas cooled by the ocean breeze.',
      image: u('1540555700478-4be289fbecef', 1200),
    },
    {
      icon: 'UtensilsCrossed',
      title: 'Ocean-to-Table Dining',
      description:
        'The morning catch, sun-ripened produce, and South Indian coastal flavours, served barefoot by the water.',
      image: u('1414235077428-338989a2e8c0', 1200),
    },
    {
      icon: 'Sunrise',
      title: 'Palm Garden & Yoga Deck',
      description:
        'A shaded grove and a sunrise yoga deck for slow stretches, sea-gazing, and long, quiet afternoons.',
      image: u('1506126613408-eca07ce68773', 1200),
    },
  ] as Amenity[],
  highlights: [
    'Direct beach access',
    'Sunrise yoga',
    'Bicycles & kayaks',
    'Outdoor showers',
    'Reef-safe everything',
    'Late checkout on request',
  ],
};

export const rooms = {
  eyebrow: 'The Villas',
  title: 'Room to breathe by the sea',
  intro:
    'Open-plan, sea-facing, and cooled by cross-breezes — each one steps from the sand.',
  items: [
    {
      id: 'palm-cabana',
      name: 'Palm Cabana',
      type: 'Cabana',
      description:
        'A breezy garden cabana under the coconut palms, a short barefoot walk from the sand.',
      pricePerNight: 6500,
      sizeSqm: 34,
      occupancy: 2,
      amenities: ['Garden terrace', 'Outdoor shower', 'King bed', 'Palm views'],
      image: u('1505693416388-ac5ce068fe85', 1100),
      rating: 4.6,
      minNights: 2,
    },
    {
      id: 'garden-bungalow',
      name: 'Garden Bungalow',
      type: 'Bungalow',
      description:
        'A serene bungalow opening onto a private courtyard of frangipani and sea breeze.',
      pricePerNight: 7500,
      sizeSqm: 42,
      occupancy: 2,
      amenities: ['Private courtyard', 'Soaking tub', 'Lounge', 'Garden access'],
      image: u('1618773928121-c32242e63f39', 1100),
      rating: 4.7,
      minNights: 2,
    },
    {
      id: 'ocean-view-suite',
      name: 'Ocean-View Suite',
      type: 'Suite',
      description:
        'Floor-to-ceiling views of the Bay of Bengal, with a balcony made for sunrise coffee.',
      pricePerNight: 11000,
      sizeSqm: 52,
      occupancy: 3,
      amenities: ['Sea-view balcony', 'Rainfall shower', 'King bed', 'Daybed'],
      image: u('1566073771259-6a8506099945', 1100),
      tag: 'Guest Favorite',
      minNights: 3,
    },
    {
      id: 'sunset-pavilion',
      name: 'Sunset Pavilion',
      type: 'Pavilion',
      description:
        'A double-height pavilion framing the western sky — golden hour, every evening.',
      pricePerNight: 14000,
      sizeSqm: 64,
      occupancy: 3,
      amenities: ['Sunset terrace', 'Plunge pool', 'Reading nook', 'Workspace'],
      image: u('1571896349842-33c89424de2d', 1100),
      rating: 4.8,
      minNights: 3,
    },
    {
      id: 'beachfront-villa',
      name: 'Beachfront Villa',
      type: 'Villa',
      description:
        'Your own stretch of shoreline — a standalone villa with a private pool and the tide at your door.',
      pricePerNight: 22000,
      sizeSqm: 96,
      occupancy: 5,
      amenities: ['Private pool', 'Direct beach access', 'Two bedrooms', 'Butler service'],
      image: u('1611892440504-42a792e24d32', 1100),
      tag: 'Guest Favorite',
      minNights: 4,
    },
  ] as Villa[],
};

export const packages = {
  eyebrow: 'Excitement & Value',
  title: 'Curated coastal escapes',
  intro:
    'Multi-night experiences composed end-to-end — arrive, kick off your shoes, and let the rest unfold.',
  items: [
    {
      id: 'weekend-beach',
      name: 'Weekend Beach Escape',
      badge: '2 nights',
      description:
        'A quick reset by the water — sunrise yoga, long lunches, and nowhere to be.',
      includes: [
        'Daily breakfast by the sea',
        'One coastal spa ritual',
        'Sunset dinner for two',
        'Late checkout',
      ],
      priceFrom: 16900,
      nights: 2,
      image: u('1507525428034-b723cf961d3e', 1100),
    },
    {
      id: 'honeymoon-sea',
      name: 'Honeymoon by the Sea',
      badge: 'Most loved',
      description:
        'A quiet celebration for two — a private pool, a private table, and the tide for company.',
      includes: [
        'Beachfront Villa upgrade',
        'Private candle-lit dinner',
        'In-villa sparkling & sweets',
        'Couples spa ritual',
      ],
      priceFrom: 48000,
      nights: 3,
      image: u('1611892440504-42a792e24d32', 1100),
      featured: true,
    },
    {
      id: 'coastal-wellness',
      name: 'Coastal Wellness Retreat',
      badge: '4 nights',
      description:
        'For the deep exhale — four unhurried days tuned to the rhythm of the sea.',
      includes: [
        'Daily yoga & meditation',
        'Ayurvedic spa journey',
        'Ocean-to-table tasting menu',
        'Sunrise beach walk',
      ],
      priceFrom: 62000,
      nights: 4,
      image: u('1506126613408-eca07ce68773', 1100),
    },
  ] as Package[],
};

export const reserve = {
  eyebrow: 'Frictionless Action',
  title: 'Reserve your stay',
  intro:
    'Tell us when, and we’ll prepare the rest. No accounts, no clutter — just a warm welcome by the water.',
  reassurance: [
    'Free cancellation up to 7 days before arrival',
    'No prepayment required to reserve',
    'A real host replies within 24 hours',
  ],
};

export const footer = {
  closingEyebrow: 'Your shoreline awaits',
  closingTitle: 'Come live the tide.',
  closingText: 'The sea keeps its own time. Reserve a few days beside it.',
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
