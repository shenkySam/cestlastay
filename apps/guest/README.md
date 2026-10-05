# C'est La Stay — Earthen LIGHT port (drop-in for `guest/`)

This folder mirrors `guest/`. Copy these files over the matching paths in your
Vite/React/Tailwind app, then `npm run dev` to verify, and commit.

The port keeps your architecture intact — lazy WebGL scene, `content.ts` as the
editing surface, GSAP smooth-scroll, SEO/schema/analytics in `index.html`,
section composition in `App.tsx`. It only **reskins the app from dark → cream
(Earthen)**, **replaces the background particle scene**, and **adds the
interactive Matrimandir sphere section**. The design-time Tweaks panel is not
included (it's a design tool, not part of the production build).

## Copy these files (overwrite)

**Theme**
- `tailwind.config.js`            → cream/clay tokens (base/surface/ink/muted flipped to light)
- `src/styles/globals.css`        → cream body, light cards/fields/scrims, clay eyebrow
- `index.html`                    → only change: `theme-color` → `#f4efe5` (SEO/schema/GA untouched)
- `src/App.tsx`                   → cream veil, inserts <Matrimandir/>, multiply grain

**New background motion (replaces your scene)**
- `src/components/scenes/SceneBackground.tsx`   → REPLACED. Warm round-dot field that
  travels on scroll: cloud (hero) → concentric ripple disc behind the sphere
  (keyed to `#matrimandir`) → wave terrain at the bottom. Light-friendly
  (normal blending). Same default export, same lazy import — no other wiring.

**New Matrimandir 3D section**
- `src/components/scenes/MatrimandirSphere.tsx` → NEW. Interactive faceted gold
  sphere (cursor-follow), lazy-loaded so three.js stays out of the initial chunk.
- `src/components/sections/Matrimandir.tsx`     → NEW. The section that frames it.

**Section reskins (dark text → clay, on cream)**
- `src/components/layout/Navbar.tsx`            → cream scrolled bar, logo swaps to clay when scrolled
- `src/components/layout/Footer.tsx`            → cream footer, clay text
- `src/components/sections/Hero.tsx`            → full-bleed `heroMain.png` hero, white text over a dark scrim
- `src/components/sections/Amenities.tsx`       → clay chips
- `src/components/sections/Stats.tsx`           → clay numerals
- `src/components/sections/Reserve.tsx`         → clay left column (form card already light)
- `src/components/sections/FooterCta.tsx`       → clay closing line
- `src/components/scenes/ClothAmenities.tsx`    → overlay copy kept white (sits over photos)

## No change needed
- `src/lib/content.ts` — already Earthen/Auroville; unchanged by this port.
- `src/components/sections/Rooms.tsx`, `Packages.tsx` — already use `text-ink`/
  `text-muted`/`card`, so the token flip restyles them automatically.
- All hooks, `lib/*`, `ui/*`, `lib/cloth/*` — unchanged.

## Notes
- **three.js**: `MatrimandirSphere` uses `three/addons/...` (OrbitControls,
  RoomEnvironment) — already available via your `three` dependency, no new install.
- **Hero embers**: the warm cloud is part of the page background, so it appears
  as you scroll below the full-bleed hero photo. If you want embers drifting
  *over* the hero photo too, say the word and I'll add a small hero-local layer.
- **Sphere copy** lives inline at the top of `Matrimandir.tsx`. Move it into
  `content.ts` (e.g. `export const matrimandir = {...}`) if you want it on the
  no-code surface.
- **Reduced motion**: both scenes render a single static frame and skip the loop.
