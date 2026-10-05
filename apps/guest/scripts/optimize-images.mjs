/**
 * Generates responsive AVIF + WebP variants for the large raster images in
 * /public, so <Img> can serve modern, right-sized formats. PNG originals are
 * kept as the universal fallback. Idempotent — safe to re-run.
 *
 *   node scripts/optimize-images.mjs   (or: pnpm optimize:images)
 *
 * Output naming (consumed by src/components/ui/Img.tsx):
 *   heroMain.png -> heroMain-480.avif/.webp, heroMain-960.*, heroMain-1440.*
 */
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, '..', 'public');

// Large rasters worth optimizing (favicons/og are already small).
const SOURCES = [
  'heroMain.png',
  'heroImage.png',
  'balcony.png',
  'rooms.png',
  'logo.png',
  'logo-mark.png',
];
const WIDTHS = [480, 960, 1440];

let count = 0;
for (const file of SOURCES) {
  const src = path.join(PUBLIC, file);
  if (!existsSync(src)) {
    console.warn('skip (missing):', file);
    continue;
  }
  const base = file.replace(/\.(png|jpe?g)$/i, '');
  const meta = await sharp(src).metadata();
  for (const w of WIDTHS) {
    if (meta.width && w > meta.width) continue; // never upscale
    const pipeline = sharp(src).resize({ width: w, withoutEnlargement: true });
    await pipeline.clone().avif({ quality: 50 }).toFile(path.join(PUBLIC, `${base}-${w}.avif`));
    await pipeline.clone().webp({ quality: 72 }).toFile(path.join(PUBLIC, `${base}-${w}.webp`));
    count += 2;
    console.log(`  ✓ ${base}-${w}.avif / .webp`);
  }
}
console.log(`\nGenerated ${count} files in ${PUBLIC}`);
