# Photography assets

Drop your own images in this folder and reference them in
[`src/lib/content.ts`](../../src/lib/content.ts) — e.g. replace the `u('...')`
Unsplash placeholders with `'/assets/your-file.jpg'`.

Until you do, the site loads tasteful Unsplash placeholders; if any image fails
to load, a warm Japandi gradient (`.img-fallback`) shows so the layout still
reads as intentional.

## Recommended slots & sizes

| Slot | Used in | Suggested size | Notes |
|------|---------|----------------|-------|
| Hero | `hero.image` | 2000×1200+ (landscape) | Cinematic, low-contrast subject so overlay text stays legible. Ken Burns + parallax applied. |
| Amenities (×4) | `amenities.items[].image` | 1200×900 | Spa, pool, dining, garden. Mixed 16:10 / 4:3 crops. |
| Rooms (×5) | `rooms.items[].image` | 1100×1375 (portrait 4:5) | One per room type. |
| Packages (×3) | `packages.items[].image` | 1100×760 (16:11) | One per offer. |
| Closing CTA | reuses `hero.image` | — | Override in `FooterCta.tsx` if you want a distinct closing image. |

## Tips
- Favour warm, soft-light, low-saturation photography to match the Japandi palette.
- Export web-optimised JP/WebP (~150–300 KB each) — images below the fold are lazy-loaded.
- Brand colours live in `tailwind.config.js`; fonts in `index.html`.
