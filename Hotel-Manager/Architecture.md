# Architecture

System overview for the **C'est La Stay** hotel platform — a Turborepo monorepo with three apps sharing one API and database.

---

## Topology

```
                    Browsers
   ┌──────────────────────────┐   ┌──────────────────────────┐
   │  cestlastay.com          │   │  app.cestlastay.com       │
   │  @hms/guest (Vercel)     │   │  @hms/web (Vercel)        │
   │  public landing + booking│   │  admin / staff / guest    │
   └────────────┬─────────────┘   └────────────┬─────────────┘
                │  HTTPS (public endpoints)     │  HTTPS + WebSocket (auth)
                └───────────────┬───────────────┘
                                ▼
                 ┌──────────────────────────────┐
                 │  @hms/api  (Railway)          │
                 │  NestJS REST + Socket.IO      │
                 │  cestlastay-production        │
                 │       .up.railway.app/api/v1  │
                 └───────────────┬──────────────┘
                                 ▼
                 ┌──────────────────────────────┐
                 │  Neon (serverless PostgreSQL) │
                 │  Prisma ORM                   │
                 └──────────────────────────────┘

   packages/shared — TypeScript types/enums imported by all apps
```

## Live URLs

| Component | URL |
|-----------|-----|
| Landing (`@hms/guest`) | `https://cestlastay.com` (+ `https://www.cestlastay.com`) |
| Admin/portal (`@hms/web`) | `https://app.cestlastay.com` |
| API (`@hms/api`) | `https://cestlastay-production.up.railway.app` |
| API base path | `https://cestlastay-production.up.railway.app/api/v1` |

`GET /api/v1/rooms/categories` is public and returns JSON — a quick liveness check for the API.

Deployment steps and required env vars live in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Apps

| App | Stack | Role |
|-----|-------|------|
| `apps/api` | NestJS 10, Prisma 6, Socket.IO, JWT, Stripe, SendGrid | REST API + real-time gateway + cron jobs |
| `apps/web` | React 18 + Vite, React Router, Tailwind | Admin / staff / guest-portal SPA (authenticated) |
| `apps/guest` | React 18 + Vite, Tailwind, three.js, GSAP | Public marketing landing + self-service booking |
| `packages/shared` | TypeScript | Shared types, enums, constants |

Database is **Neon** Postgres via Prisma (`DATABASE_URL` pooled + `DIRECT_URL`). Schema: [database-schema.md](database-schema.md).

---

## Key data flows

**Public booking (guest → DB).** The landing's reserve form (and each stay card's "Reserve") posts to `POST /bookings/public` (`@Public`). The API finds-or-creates the guest by email, resolves the chosen `RoomCategory` → an available room, prices it from `basePrice`, and creates a booking attributed to the `system@hotel.com` user (CONFIRMED if a room is free, else PENDING for staff to confirm).

**Admin pricing → guest display (hybrid).** Stays are `RoomCategory` rows. Admins edit name/description/price in the web **Stays & Pricing** page (`/admin/stays` → `POST/PATCH/DELETE /rooms/categories`). The landing fetches `GET /rooms/categories` (`@Public`) and **overlays live name/description/price onto each stay card by matching category name**, falling back to local marketing content (`apps/guest/src/lib/content.ts`) when the API is off or unmatched. Photos/tags stay local.

**Newsletter.** The footer email field posts to `POST /crm/subscribe` (`@Public`), persisted to `newsletter_subscribers`; admins read `GET /crm/subscribers`.

**Real-time (web only).** A single `NotificationsGateway` (Socket.IO, namespace `/`) emits `notification:new`, `room:status-changed`, `booking:checked-in/out`. The guest landing does not use sockets. See [websocket-events.md](websocket-events.md).

---

## Cross-origin & config

The API allows browser origins via `CORS_ORIGINS` (comma-separated; covers both HTTP and WebSocket) — must include the landing and admin origins. The guest landing's API calls are gated by the build-time flag `VITE_ENABLE_BOOKING_API` and target `VITE_API_URL`. Exact values: [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Images (landing performance)

Large landing photos are pre-generated as responsive **AVIF + WebP** at 480/960/1440 widths (`apps/guest/scripts/optimize-images.mjs` → committed to `public/`), served via `<picture>`/`srcset` from `Img.tsx`, with the LCP hero preloaded in `index.html` and long-lived cache headers in `vercel.json`. PNG originals remain as universal fallbacks.
