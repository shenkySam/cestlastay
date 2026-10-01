/**
 * Dev helper — creates the public "stays" as RoomCategory rows so the guest
 * landing (cestlastay.com) renders them from the database (admin-editable via
 * the web "Stays & Pricing" page). The guest matches a stay card to a category
 * by NAME, so these names mirror apps/guest/src/lib/content.ts.
 *
 * Idempotent: skips any category that already exists (never clobbers edits).
 * Sign-in is Google / Apple only, so pass an admin access token: sign in to the
 * web app as an admin, then copy localStorage.accessToken from DevTools.
 * Run with the API up:  ADMIN_TOKEN=<token> node apps/api/prisma/seed-stays.mjs
 */
const API = process.env.API_URL || 'http://localhost:3000/api/v1';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const stays = [
  {
    name: 'Banyan Bunk', type: 'SINGLE', basePrice: 1400, maxOccupancy: 4,
    description: 'A bright bunk room under the banyan, with a shared bath and a door onto the garden.',
    amenities: ['4-bed dorm', 'Shared bath', 'Reading light & locker', 'Garden access'],
    images: ['/rooms.png'],
  },
  {
    name: 'Canopy Dorm Bed', type: 'SINGLE', basePrice: 1200, maxOccupancy: 6,
    description: 'A single bed in a breezy mixed dorm — the easy, sociable way to stay in Auroville.',
    amenities: ['Mixed dorm', 'Shared bath', 'Linens included', 'Ceiling fan'],
    images: ['/heroImage.png'],
  },
  {
    name: 'Courtyard Hostel Room', type: 'DOUBLE', basePrice: 2400, maxOccupancy: 2,
    description: 'A private clay-walled room off the courtyard — hostel ease, with a door you can close.',
    amenities: ['Private room', 'Shared bath', 'Courtyard view', 'King bed'],
    images: ['/heroMain.png'],
  },
  {
    name: 'Matrimandir Family Room', type: 'DELUXE', basePrice: 5500, maxOccupancy: 3,
    description: 'An upstairs room with a private bath and a balcony framing the golden dome at dusk.',
    amenities: ['Private bath', 'Dome-view balcony', 'King + single', 'Hammock'],
    images: ['/balcony.png'],
  },
  {
    name: 'Sunrise Family Suite', type: 'SUITE', basePrice: 6800, maxOccupancy: 4,
    description: 'The top suite — two bedrooms, a private bath, and a hammock balcony made for first light.',
    amenities: ['Two bedrooms', 'Private bath', 'Hammock balcony', 'Sunrise view'],
    images: ['/balcony.png'],
  },
];

const parse = async (res) => {
  const t = await res.text();
  try { return JSON.parse(t); } catch { return t; }
};

(async () => {
  if (!ADMIN_TOKEN) {
    console.error('Set ADMIN_TOKEN to an admin access token (see header comment).');
    process.exit(1);
  }
  const auth = { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_TOKEN}` };

  const existing = await parse(await fetch(`${API}/rooms/categories`, { headers: auth }));
  const have = new Set((existing || []).map((c) => c.name.trim().toLowerCase()));

  for (const s of stays) {
    if (have.has(s.name.toLowerCase())) {
      console.log('skip (exists):', s.name);
      continue;
    }
    const res = await fetch(`${API}/rooms/categories`, {
      method: 'POST', headers: auth, body: JSON.stringify(s),
    });
    console.log(res.ok ? 'created:    ' : `FAILED(${res.status}):`, s.name, res.ok ? '' : await parse(res));
  }

  const after = await parse(await fetch(`${API}/rooms/categories`, { headers: auth }));
  console.log(`\nCategories now (${after.length}):`);
  for (const c of after) console.log(`  - ${c.name} · ${c.type} · ₹${c.basePrice} · occ ${c.maxOccupancy}`);
})();
