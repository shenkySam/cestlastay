# ADR-001: Architecture Evaluation — C'est La Stay Hotel Management System

**Status:** Accepted (existing architecture evaluated)
**Date:** 2026-06-22
**Deciders:** Utkarsh (CTO)

---

## Context

This ADR evaluates the current architecture of the C'est La Stay Hotel Management System as it stands today. The system is a Turborepo monorepo with three deployable apps:

- `apps/api` — NestJS REST + Socket.IO backend, deployed on Railway
- `apps/web` — React/Vite staff & admin SPA, deployed on Vercel
- `apps/guest` — React/Vite public-facing landing page, deployed on Vercel

**Tech surface examined:** project structure, module graph, database schema (18 models, 12 enums), API surface (~45 endpoints across 12 modules), WebSocket events, deployment config, and all architectural documentation.

---

## Current Architecture Summary

```
┌─────────────────────────────────────┐
│  apps/guest (Vercel)                │  Public landing + booking form
│  React + Vite + Tailwind + GSAP     │
└───────────────┬─────────────────────┘
                │ REST (VITE_API_URL)
┌───────────────▼─────────────────────┐
│  apps/web (Vercel)                  │  Staff + admin portal SPA
│  React + Vite + SocketContext       │
└───────────────┬─────────────────────┘
                │ REST + Socket.IO
┌───────────────▼─────────────────────┐
│  apps/api (Railway)                 │  NestJS monolith
│  Auth · Rooms · Bookings · Services │
│  Housekeeping · Invoices · Payments │
│  CRM · OTA · Analytics · Ratings   │
│  Single Socket.IO gateway           │
└───────────────┬─────────────────────┘
                │ Prisma ORM
┌───────────────▼─────────────────────┐
│  Supabase / PostgreSQL              │  Managed DB, 18 tables
└─────────────────────────────────────┘
```

---

## What's Working Well

### 1. Monorepo with Turborepo + pnpm — Solid Choice
The `packages/shared` package sharing types and enums across `apps/api` and `apps/web` is exactly the right use of a monorepo. Any API contract change breaks the TypeScript compile in the frontend immediately — no runtime surprises. The `turbo.json` build graph is clean.

### 2. NestJS Module Structure — Clean and Scalable
The module-per-domain layout (`auth`, `rooms`, `bookings`, `services`, `housekeeping`, `invoices`, `payments`, `crm`, `ota`, `analytics`, `ratings`) is well-bounded. Global `JwtAuthGuard` + `RolesGuard` as `APP_GUARD` is the correct pattern. DTOs with `class-validator` give good input defense.

### 3. Single Socket.IO Gateway — Correct Decision
Centralizing all WebSocket emission in `NotificationsGateway` and making `RoomsGateway`/`BookingsGateway` thin delegates avoids namespace conflicts and race conditions. This is harder to get right than it looks, and it's done correctly.

### 4. Database Schema — Well-Designed
- UUIDs as PKs — right call for distributed writes and future sharding
- `DECIMAL(10,2)` for all money — no floating-point bugs
- Strategic composite indexes (`idx_bookings_dates`, `idx_users_role_status`, `idx_notifications_user_status`) — shows foresight
- `audit_logs` table already present — good for compliance before you need it
- Guest can exist without a user account (walk-ins) — models the real world correctly

### 5. Stripe Integration Pattern — Correct
`rawBody: true` on the factory, webhook route marked `@Public()`, `PaymentIntent` flow with client secret — this is the secure, PCI-compliant pattern. No shortcuts taken.

### 6. Deployment Separation — Appropriate
Vercel for static SPAs + Railway for the long-running Node process (WebSocket + cron jobs) is the right split. Railway's `$PORT` injection is handled correctly.

---

## Risks and Gaps

### Risk 1 — No Redis Adapter for Socket.IO (HIGH, blocking for multi-replica)
**What it is:** `main.ts` uses `new IoAdapter(app)` — the default in-memory Socket.IO adapter. The `room:status-changed` broadcast reaches only clients connected to the **same process instance**. If Railway auto-scales to 2+ replicas, half the connected staff won't see real-time updates.

**Impact:** Silent split-brain on room status, check-in alerts, and service request notifications. Staff on different replicas see stale data.

**Fix:**
```typescript
// Replace IoAdapter with RedisIoAdapter
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```
Add Railway Redis service + `REDIS_URL` env var. Cost: ~$5/mo on Railway.

---

### Risk 2 — No Pagination on List Endpoints (HIGH, near-term)
**What it is:** All list endpoints (`GET /bookings`, `GET /guests`, `GET /rooms`, `GET /notifications`) return plain arrays with no `limit`/`offset`/cursor. This is documented as intentional ("Phase 2").

**Impact:** When a hotel reaches ~500 bookings or ~1,000 guests, every page load fetches the full table. At 5,000 rows, response times become user-noticeable. At 50,000, it's an outage.

**Fix:** Add optional `?page=1&limit=50` query params to service methods. The Prisma calls are already isolated in service files — a surgical change.

---

### Risk 3 — Guest Session in localStorage (MEDIUM)
**What it is:** Guest JWT and user object are stored in `localStorage.guestUser` at login. This is called out explicitly in the docs: "guests restore from `localStorage.guestUser` (not `/auth/me`)."

**Impact:** XSS vulnerability. Any injected script in the guest portal can steal the token and impersonate the guest to see their invoice, submit service requests, and access their booking.

**Fix:** Move to `httpOnly` cookie auth for the guest portal. Alternatively, keep `localStorage` but scope the guest token's permissions tightly (it's already limited) and add a `Content-Security-Policy` header that blocks inline scripts.

---

### Risk 4 — `prisma migrate deploy` on Every Container Start (MEDIUM)
**What it is:** The Dockerfile / Railway setup runs `prisma migrate deploy` every time the container boots. As noted in DEPLOYMENT.md: "With multiple replicas, move migrations to a release step."

**Impact:** With multiple Railway replicas, two containers can run migrations concurrently on startup, potentially causing deadlocks or double-apply errors on non-idempotent migrations.

**Fix:** Add a Railway release command (`railway.json → deploy.cmd`) or a one-off migration step that runs before the service starts, not during it. Prisma's migration table handles idempotency, but concurrent bootstrap is still risky.

---

### Risk 5 — No Caching Layer (LOW, future)
**What it is:** Every request hits PostgreSQL directly through Prisma. Room categories, staff lists, and room availability calculations are re-queried on every page load.

**Impact:** Acceptable today. Becomes noticeable at sustained load (100+ concurrent staff users).

**Fix when needed:** Add Redis (already needed for Socket.IO) for short-lived caches on `GET /rooms/categories`, `GET /users/staff-list`. These are low-write, high-read.

---

### Risk 6 — No Rate Limiting or Brute-Force Protection (LOW, pre-launch)
**What it is:** `POST /auth/login` and `POST /auth/guest-portal` have no rate limiting. The NestJS app has no throttle guard.

**Impact:** Credential stuffing and enumeration attacks are unanswered.

**Fix:**
```typescript
// In auth module
import { ThrottlerModule } from '@nestjs/throttler';
// 10 attempts per 60 seconds per IP
ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])
```

---

### Gap 1 — Guest App Has No Real Routing (Informational)
`apps/guest/src/App.tsx` renders a landing page. There are booking-related type files (`booking.types.ts`, `booking.ts`) and a `portal.ts` lib, but the guest app's main content is a single-page scroll with GSAP animations. The booking form integration with the API (`VITE_ENABLE_BOOKING_API=true`) is flagged as not yet active. This is fine for a landing page but worth tracking as its own milestone.

---

### Gap 2 — No Observability (Informational)
There's no structured logging, no distributed tracing, and no error monitoring (Sentry, Datadog, etc.) wired up. For an MVP this is acceptable. Before production load, add at minimum:
- `@nestjs/throttler` (rate limiting, see Risk 6)
- Sentry SDK for unhandled exceptions
- Railway's built-in log drain to Datadog or Logtail

---

## Trade-off Analysis

| Dimension | Current State | Verdict |
|-----------|--------------|---------|
| Type safety (end-to-end) | Excellent — shared `packages/shared`, Prisma client, DTO pipes | ✅ Keep |
| Real-time (single replica) | Correct — in-memory adapter works fine | ✅ |
| Real-time (multi-replica) | Broken — no Redis adapter | ⚠️ Fix before scaling |
| DB query performance | Good indexes; no pagination yet | ⚠️ Add pagination soon |
| Security (staff/admin) | JWT + role guards — solid | ✅ |
| Security (guest portal) | localStorage token — XSS surface | ⚠️ Harden |
| Deployment correctness | Correct split (Railway + Vercel) | ✅ |
| Horizontal scalability | Blocked by Socket.IO adapter | ⚠️ |
| Observability | None yet | ⚠️ Add pre-launch |
| Cost (current) | Free/cheap tiers across the board | ✅ |

---

## Consequences

**What becomes easier with current architecture:**
- Adding new modules (OTA, Analytics, Ratings are already stubbed in `app.module.ts`)
- Sharing types when adding a React Native mobile app
- Running the full stack locally with a single `pnpm dev`

**What becomes harder:**
- Scaling the API horizontally without the Redis adapter fix
- Adding SSR to either frontend (both are pure SPAs — not a problem unless SEO is needed for the admin portal)
- Migrating away from Supabase (low risk — it's just PostgreSQL with a connection string)

**What to revisit at scale:**
- Dedicated job queue (BullMQ/Redis) if cron jobs grow beyond the current 2 scheduled tasks
- Separate read replicas if analytics queries start competing with OLTP
- Consider an API gateway / rate-limit proxy (Nginx, Cloudflare Workers) in front of Railway

---

## Action Items

| Priority | Item | Effort |
|----------|------|--------|
| 🔴 High | Add Redis adapter for Socket.IO (blocks multi-replica scaling) | ~4 hours |
| 🔴 High | Add pagination to list endpoints | ~1 day |
| 🟡 Medium | Move `prisma migrate deploy` to a release step (not container boot) | ~2 hours |
| 🟡 Medium | Harden guest portal session (httpOnly cookie or CSP header) | ~4 hours |
| 🟡 Medium | Add `@nestjs/throttler` to auth routes | ~1 hour |
| 🟢 Low | Wire up Sentry (backend) + structured logging | ~2 hours |
| 🟢 Low | Add Redis caching for low-write endpoints (`/rooms/categories`, `/users/staff-list`) | ~3 hours |
