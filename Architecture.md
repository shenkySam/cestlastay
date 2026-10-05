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
                 ┌──────────────────────────────┐      ┌──────────────────────┐
                 │  @hms/api  (Railway)          │ ───▶ │ SendGrid (outbound   │
                 │  NestJS REST + Socket.IO      │      │  transactional mail) │
                 │  cestlastay-production        │      └──────────────────────┘
                 │       .up.railway.app/api/v1  │      ┌──────────────────────┐
                 │                               │ ◀──▶ │ Resend (inbound      │
                 └───────────────┬──────────────┘      │  stay@ → team)       │
                                 ▼                      └──────────────────────┘
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
| `apps/api` | NestJS 10, Prisma 6, Socket.IO, JWT, Stripe, SendGrid, Resend | REST API + real-time gateway + cron jobs + inbound-mail webhook |
| `apps/web` | React 18 + Vite, React Router, Tailwind | Admin / staff / guest-portal SPA (authenticated); one sign-in page at `/login` (`?as=guest\|staff`) |
| `apps/guest` | Static `index.html` + vanilla JS in `public/` (three.js via CDN importmap); Vite only serves/copies it | Public marketing landing + self-service booking |

> `apps/guest/src/` holds an earlier React/Tailwind/GSAP version of the landing that isn't loaded by `index.html` and doesn't ship. Make landing changes in `index.html` and `public/*.js`.
| `packages/shared` | TypeScript | Shared types, enums, constants |

Database is **Neon** Postgres via Prisma (`DATABASE_URL` pooled + `DIRECT_URL`). Schema: [database-schema.md](database-schema.md).

---

## Key data flows

**Public booking (guest → DB).** On the landing (`public/site.js`), the hero booking bar's search calls `GET /rooms/availability` and marks which stays are free for the dates. The booking modal (opened by "Reserve" / "Check availability") posts to `POST /bookings/public` (`@Public`). The API finds-or-creates the guest by email, resolves the chosen `RoomCategory` → an available room, prices it from `basePrice`, and creates a booking attributed to the `system@hotel.com` user (CONFIRMED if a room is free, else PENDING for staff to confirm).

**Admin pricing → guest display (hybrid).** Stays are `RoomCategory` rows. Admins edit name/description/price in the web **Stays & Pricing** page (`/admin/stays` → `POST/PATCH/DELETE /rooms/categories`). The landing (`site.js`) fetches `GET /rooms/categories` (`@Public`) and **overlays live name/description/price onto each stay row by matching category name** (case-insensitive). When the API is down or a name doesn't match, it falls back to the copy written into `index.html`. Photos/tags stay local. The booking modal's stay dropdown always lists exactly the stays shown on the page.

**Newsletter.** The footer email field posts to `POST /crm/subscribe` (`@Public`), persisted to `newsletter_subscribers`; admins read `GET /crm/subscribers`.

**Inbound email.** `stay@cestlastay.com` (shown in the landing's contact section and footer) has no mailbox. Resend receives the mail and POSTs a signed `email.received` webhook to `POST /webhooks/resend`. The API verifies the signature, fetches the message and attachments from Resend, and re-sends it to the team inboxes in `RESEND_FORWARD_TO` with Reply-To set to the original sender. Outbound transactional mail (confirmations, reminders, loyalty) goes through SendGrid. See [api-endpoints.md](api-endpoints.md) → *Inbound Email*.

**Real-time (web only).** A single `NotificationsGateway` (Socket.IO, namespace `/`) emits `notification:new` (per user), plus `room:status-changed` and `booking:checked-in/out` (staff room only). The JWT is verified in the handshake. The guest landing does not use sockets. See [websocket-events.md](websocket-events.md).

---

## Cross-origin & config

The API allows browser origins via `CORS_ORIGINS` (comma-separated; covers both HTTP and WebSocket) — must include the landing and admin origins. The guest landing reads no env vars: `public/site.js` picks the API base at runtime (`http://localhost:3000/api/v1` on localhost, otherwise the Railway URL). Exact values: [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Images (landing performance)

Large landing photos are pre-generated as responsive **AVIF + WebP** at 480/960/1440 widths (`apps/guest/scripts/optimize-images.mjs`, using sharp, committed to `public/`). They are served via `<picture>`/`srcset` directly in `index.html`, with the LCP hero preloaded there and long-lived cache headers in `vercel.json`. PNG originals remain as universal fallbacks.
