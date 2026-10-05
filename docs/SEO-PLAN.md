# C'est La Stay — SEO Implementation Plan

> Property: beachfront villas + wellness/yoga, Auroville coast (Bay of Bengal, near Pondicherry).
> Public site: `apps/guest` (Vite + React SPA). Production domain confirmed: `https://cestlastay.com`.

---

## 0. The one structural risk to fix first (SPA crawlability)

The guest site is a client-rendered SPA with a WebGL scene. Googlebot renders JS (slowly); **Bingbot and most AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) largely do not.** They see only the static `index.html`.

- [ ] Keep ALL SEO-critical markup (title, meta, canonical, OG, JSON-LD) **inline in `apps/guest/index.html`** — never injected by React. Works today because the site is one page.
- [ ] Build every future indexable page (FAQ, blog, yoga/services pages) as **prerendered static HTML** — either `vite-plugin-prerender` / `vite-ssg`, or an Astro sub-site at `/blog` and `/faq`. Do not add client-side-only routes and expect them to rank.
- [ ] Mirror the chatbot's canned answers onto a crawlable `/faq` page (see §3). Bots can't index a chat widget.

---

## 1. Technical SEO Setup

### 1.1 robots.txt — `apps/guest/public/robots.txt`

```txt
# C'est La Stay
User-agent: *
Allow: /
Disallow: /portal/
Disallow: /admin/
Disallow: /api/

# AI / answer-engine crawlers — explicitly allowed so the bot pages and FAQ
# can be cited by Gemini, Copilot, ChatGPT, Perplexity, Claude
User-agent: GPTBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Bingbot
Allow: /

Sitemap: https://cestlastay.com/sitemap.xml
```

> The admin/staff app (`apps/web`) should live on a separate subdomain (e.g. `app.cestlastay.com`) with its own `robots.txt` containing `Disallow: /` plus `<meta name="robots" content="noindex">`.

### 1.2 sitemap.xml — `apps/guest/public/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://cestlastay.com/</loc>
    <lastmod>2026-06-11</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- Add as pages ship: -->
  <url><loc>https://cestlastay.com/faq</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://cestlastay.com/yoga-auroville</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://cestlastay.com/blog/</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>
</urlset>
```

- [ ] Submit in **Google Search Console** → verify domain (DNS TXT record) → Sitemaps → submit `sitemap.xml`.
- [ ] Submit in **Bing Webmaster Tools** → "Import from GSC" (one click, reuses verification) → confirm sitemap imported.
- [ ] Enable **IndexNow** for Bing: generate a key, drop `apps/guest/public/<key>.txt`, ping `https://api.indexnow.org/indexnow?url=...&key=...` on each deploy (one curl line in CI).

### 1.3 Canonical + social meta — add to `apps/guest/index.html` `<head>`

```html
<link rel="canonical" href="https://cestlastay.com/" />
<meta name="robots" content="index, follow, max-image-preview:large" />

<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="C'est La Stay" />
<meta property="og:title" content="C'est La Stay · Beachfront Villas & Yoga Retreat, Auroville" />
<meta property="og:description" content="Private beachfront villas, sunrise yoga, and slow mornings on the Bay of Bengal — minutes from Auroville and Pondicherry. Book direct for the best rate." />
<meta property="og:url" content="https://cestlastay.com/" />
<meta property="og:image" content="https://cestlastay.com/og-cover.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- Twitter / X -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="C'est La Stay · Beachfront Villas, Auroville Coast" />
<meta name="twitter:image" content="https://cestlastay.com/og-cover.jpg" />
```

- [ ] Create a 1200×630 `og-cover.jpg` (hero villa shot, <200 KB) in `apps/guest/public/`.
- [ ] If the site ever serves both `www` and apex, 301 one to the other and keep canonical consistent.

### 1.4 Page speed

Already good: three.js is lazy-chunked in `App.tsx`, `Img.tsx` does `loading="lazy"` + `decoding="async"`, fonts use `display=swap` + preconnect.

- [ ] Convert villa/hero photos to **AVIF/WebP** with JPEG fallback; target <150 KB each. Add `vite-plugin-image-optimizer` or pre-compress with Squoosh.
- [ ] Add `priority` (eager) + `fetchpriority="high"` only to the first hero image; everything else stays lazy.
- [ ] Self-host the three Google Fonts (use `@fontsource/fraunces`, `@fontsource/hanken-grotesk`, `@fontsource/caveat`) — removes 2 third-party connections, improves LCP and privacy.
- [ ] Enable Brotli/gzip on the host (Netlify/Vercel/Cloudflare do this automatically; nginx needs `brotli on`).
- [ ] Budget: **LCP < 2.5 s, INP < 200 ms, CLS < 0.1** on mid-tier mobile. The WebGL scene is the main risk — confirm `prefers-reduced-motion` fallback also triggers on low-end devices (e.g. skip the scene when `navigator.hardwareConcurrency <= 4` or on `saveData`).
- [ ] Run Lighthouse (mobile preset) before/after each change; keep Performance ≥ 85.

### 1.5 Mobile-first checks

- [ ] Viewport meta ✅ (already present). Test 360×640 and 390×844: tap targets ≥ 44 px, no horizontal scroll, carousel swipe works.
- [ ] GSC → Page Experience report after indexing; fix anything flagged.

---

## 2. On-Page SEO

### 2.1 Keyword map

| Intent | Primary keywords | Long-tail / supporting |
|---|---|---|
| Rooms / booking | beachfront villa Auroville · Auroville beach resort · places to stay in Auroville | book beach villa near Pondicherry · private pool villa East Coast Road · Auroville guest house with breakfast · beach resort near Serenity Beach |
| Wellness / yoga | yoga retreat Auroville · wellness retreat Pondicherry | sunrise beach yoga Auroville · yoga and stay packages Tamil Nadu · meditation retreat near Auroville Matrimandir · ayurveda wellness stay Pondicherry |
| Local / voice | hotels near Auroville · resorts in Pondicherry on the beach | "best beachfront stay near Auroville" · "how much is a villa in Auroville per night" · "is C'est La Stay pet friendly" |
| Chatbot queries | C'est La Stay booking · C'est La Stay check-in time | check villa availability · cancel my booking C'est La Stay · what's included in the wellness package |

Note: target **"Auroville"** (official spelling) as primary, but include "Auroville / Pondicherry / Puducherry" variants — searchers use all three. Validate volumes in Google Keyword Planner (free) before committing copy.

### 2.2 Title / meta / headings

- [ ] Title (≤ 60 chars): `Beachfront Villas & Yoga Retreat in Auroville | C'est La Stay`
- [ ] Meta description (≤ 155 chars): `Private beachfront villas, sunrise yoga and slow mornings on the Bay of Bengal, minutes from Auroville. Check availability and book direct.`
- [ ] Exactly **one `<h1>`** in `Hero.tsx` containing the primary keyword (e.g. "Beachfront villas on the Auroville coast"). Audit each section component — section titles should be `<h2>` (Amenities, Rooms, Packages, Reserve), card titles `<h3>`. Verify no decorative text is using h-tags.

### 2.3 Images

- [ ] `Img.tsx` already requires `alt` — write descriptive, keyword-bearing alt text: `alt="Ocean-view villa bedroom with palm shade at C'est La Stay, Auroville"` not `alt="room 1"`.
- [ ] Rename files descriptively before upload: `auroville-beachfront-villa-sunrise.webp`, not `IMG_4021.jpg`.

### 2.4 Internal linking

- [ ] Navbar anchors (Rooms, Packages, Reserve) ✅ — keep them as real `<a href="#rooms">` links, not JS-only handlers.
- [ ] Once `/faq`, `/yoga-auroville`, `/blog` exist: footer links to all of them from every page; each blog post links to one room/package section and the FAQ; FAQ answers link back to Reserve. Target ≤ 2 clicks from home to any page.

### 2.5 Schema markup (JSON-LD, inline in `index.html`)

**LodgingBusiness / Resort:**

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Resort",
  "name": "C'est La Stay",
  "description": "Beachfront villas and yoga retreat on the Bay of Bengal, near Auroville, Pondicherry.",
  "url": "https://cestlastay.com",
  "image": "https://cestlastay.com/og-cover.jpg",
  "telephone": "+91-XXXXXXXXXX",
  "email": "stay@cestlastay.com",
  "priceRange": "₹₹₹",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "<street / beach road>",
    "addressLocality": "Auroville",
    "addressRegion": "Tamil Nadu",
    "postalCode": "605101",
    "addressCountry": "IN"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 12.0052, "longitude": 79.8333 },
  "checkinTime": "14:00",
  "checkoutTime": "11:00",
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "Beachfront access", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Daily yoga sessions", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Free Wi-Fi", "value": true }
  ],
  "makesOffer": {
    "@type": "Offer",
    "name": "Sunrise Yoga & Stay Package",
    "category": "Wellness",
    "url": "https://cestlastay.com/#packages"
  }
}
</script>
```

> Use real coordinates, phone, postcode. Do **not** add `aggregateRating` until you have genuine on-site reviews — fake ratings risk a manual action.

**FAQPage (on the `/faq` page, mirroring chatbot answers):**

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What time is check-in at C'est La Stay?",
      "acceptedAnswer": { "@type": "Answer", "text": "Check-in is from 2:00 PM and check-out is by 11:00 AM. Early check-in is available on request, subject to availability." }
    },
    {
      "@type": "Question",
      "name": "Are yoga classes included with the stay?",
      "acceptedAnswer": { "@type": "Answer", "text": "Daily sunrise yoga on the beach is complimentary for all guests. Private sessions and multi-day wellness packages can be booked separately." }
    },
    {
      "@type": "Question",
      "name": "How far is C'est La Stay from Auroville and Pondicherry?",
      "acceptedAnswer": { "@type": "Answer", "text": "The villas are minutes from Auroville and about a 20-minute drive from central Pondicherry, right on the Bay of Bengal." }
    }
  ]
}
</script>
```

**Service (yoga/wellness):**

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "Yoga and wellness retreat",
  "provider": { "@type": "Resort", "name": "C'est La Stay" },
  "areaServed": { "@type": "Place", "name": "Auroville, Pondicherry, Tamil Nadu" },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Wellness offerings",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Sunrise beach yoga" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "3-day wellness reset package" } }
    ]
  }
}
</script>
```

- [ ] Validate everything at https://validator.schema.org and GSC's Rich Results report.

---

## 3. Content SEO

- [ ] **Crawlable FAQ page** (`/faq`, prerendered HTML): export the chatbot's top 15–20 Q&As, group by topic (Booking, Rooms, Yoga & Wellness, Getting Here, Policies). Each Q is an `<h2>`/`<h3>`, answer in plain text, FAQPage JSON-LD attached. This single page powers voice search, AI citations, and rich results.
- [ ] **Blog topics** (1–2/month, prerendered):
  1. "A Slow Travel Guide to Auroville: Beaches, Cafés, and the Matrimandir"
  2. "Sunrise Yoga on the Bay of Bengal: What a Morning at C'est La Stay Looks Like"
  3. "Pondicherry vs Auroville: Where to Stay for a Wellness Trip"
  4. "Best Time to Visit Auroville (Month-by-Month Weather + What to Pack)"
  5. "How to Book Direct and Save: Hotel Booking Tips Nobody Tells You"
  6. "5 Beginner-Friendly Yoga Flows You Can Do on the Beach"
  7. "A 3-Day Wellness Itinerary: Auroville, ECR, and the Coast"
- [ ] **Geo-targeted content**: one landing page per locality cluster — `/yoga-auroville`, `/beach-villas-pondicherry`. Mention real nearby anchors (Serenity Beach, Matrimandir, ECR, Quiet Healing Center) — proximity content is what local + AI search quotes.
- [ ] **Voice search**: write FAQ answers as full conversational sentences (40–50 words), front-load the direct answer, then detail. Target question phrasing ("how much…", "is there…", "what time…").
- [ ] **Freshness cadence**: monthly — update packages/pricing copy + `lastmod` in sitemap; quarterly — refresh one old blog post and the FAQ from new chatbot logs (the questions guests actually ask the bot are your highest-value content backlog).

---

## 4. Off-Page SEO

- [ ] **Backlinks** (quality over volume, 2–4/month):
  - Auroville ecosystem: auroville.org guest accommodation listings, Auroville Outreach, local community directories.
  - Wellness/yoga: BookYogaRetreats, Tripaneer, Retreat Guru, yoga teacher blogs (offer a free stay-for-review or guest post).
  - Travel: Pondicherry tourism blogs, ECR road-trip listicles, "best beach stays in Tamil Nadu" roundups — pitch inclusion.
  - Press: local lifestyle media (The Hindu MetroPlus, Condé Nast Traveller India) with a story angle (design villas + WebGL website is itself a hook).
- [ ] **AI/tool directories for the chatbot**: Product Hunt launch (position as "AI concierge for boutique stays"), There's An AI For That, BotList, Futurepedia. Link the listing to the FAQ page, not just the homepage.
- [ ] **Social**: Instagram (Reels: 15-s sunrise yoga, villa walk-throughs, 3×/week, geotag Auroville), YouTube (see §6 video), LinkedIn (founder build-in-public posts about the hotel-manager platform — earns dev/startup backlinks), Pinterest (villa interiors pin well and drive long-tail traffic).
- [ ] **Google Business Profile**: claim listing as category "Resort" (+ "Yoga retreat center" secondary); exact NAP matching the website footer and schema; 20+ geotagged photos; weekly Posts; ask every checkout guest for a review via QR/WhatsApp link; respond to all reviews within 48 h. Same NAP on Bing Places.

---

## 5. Analytics & Monitoring

- [ ] **GA4**: add to `index.html` head (or via GTM):

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

  Track custom events: `begin_checkout` (Reserve form start), `generate_lead` (booking submitted → fire on the `POST /bookings/public` success), `chat_opened`, `chat_question` (with topic param). These tie SEO traffic to bookings.
- [ ] **GSC + Bing Webmaster Tools**: verified in §1.2. Weekly: check Coverage/Indexing, queries, CTR. Bing WMT also gives a free site audit + keyword research.
- [ ] **Rank tracking**: free — GSC Performance report + **Ahrefs Webmaster Tools** (free for your own site) + Bing WMT; paid when budget allows — Semrush or SE Ranking (~$50/mo, India-friendly) tracking ~30 keywords for both google.co.in and bing.com, desktop + mobile, Pondicherry geo.
- [ ] **Site health audit** (monthly): Screaming Frog free tier (≤500 URLs) for broken links/redirect chains/missing meta; Lighthouse CI in GitHub Actions to catch perf regressions on PRs; GSC crawl stats for errors.

---

## 6. Search-Type Optimization Matrix

| Channel | Action items |
|---|---|
| **Google** | Everything above; entity-building: same name/description across site, GBP, socials, directories. |
| **Bing** | Bing WMT + IndexNow (§1.2); Bing rewards exact-match keywords and metadata more than Google — keep title/description literal; Bing Places listing. |
| **Voice (Assistant/Siri/Alexa)** | FAQPage schema + conversational answers (§3); GBP fully filled (voice local results read from it); add `speakable` schema to FAQ top answers. |
| **AI search (Gemini, Copilot, ChatGPT, Perplexity)** | Allow AI crawlers in robots.txt (§1.1); FAQ + schema in static HTML (not JS-rendered); add an `llms.txt` at the root summarizing the property, offerings, and FAQ URL; consistent facts everywhere (AI engines cross-check). |
| **Local** | GBP + Bing Places (§4); geo keywords in title/H1; LodgingBusiness schema with geo coordinates; embedded map on Reserve section; local backlinks (Auroville directories). |
| **Image** | Descriptive filenames + alt (§2.3); AVIF/WebP ≤150 KB; `max-image-preview:large` robots meta (§1.3); image sitemap entries if villa photos matter for discovery. |
| **Video** | YouTube channel: 60–90 s villa tour, "Sunrise yoga at C'est La Stay", "How to book in 30 seconds with our concierge bot"; keyword-rich titles/descriptions with site link; embed the tour on the homepage (Rooms section) with VideoObject schema; Shorts cross-posted to Reels. |

---

## Rollout order

**Week 1 (foundation):** robots.txt, sitemap.xml, canonical + OG tags, LodgingBusiness JSON-LD, GSC + Bing verification, GA4. All inside `apps/guest/index.html` + `public/` — no architecture changes.
**Weeks 2–4:** image optimization + font self-hosting, heading audit, GBP setup, FAQ page (prerendered) + FAQPage schema, IndexNow in CI.
**Month 2+:** blog + geo landing pages (prerendered), backlink outreach, directory submissions, YouTube videos, monthly audit cadence.
