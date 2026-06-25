# Deployment Guide

This monorepo deploys as **three independent services** that connect at runtime via URLs:

| App | Path | Platform | Why |
|-----|------|----------|-----|
| **API** (`@hms/api`) | `apps/api` | **Railway** | Long-running NestJS server: Socket.IO websockets + `@Cron` jobs + Prisma. Needs an always-on process. |
| **Admin / portal** (`@hms/web`) | `apps/web` | **Vercel** | Static React/Vite SPA. |
| **Landing** (`@hms/guest`) | `apps/guest` | **Vercel** | Static React/Vite SPA (the C'est La Stay landing). Its **Login** button → the admin URL. |

> The repo root (`cestlastay`) has no app in it. **Every service must point at a subdirectory** —
> that is why the first Railway deploy failed. Config files in this repo:
> `railway.json` (root), `apps/web/vercel.json`, `apps/guest/vercel.json`, `apps/api/Dockerfile`.

Push to GitHub first (Railway & Vercel deploy from the repo).

---

## 1) Railway — API

1. Open the failing service → **Settings → Source** → set **Root Directory = `Hotel-Manager`**, Save.
   - Railway then finds `Hotel-Manager/railway.json`, which builds `apps/api/Dockerfile` (whole workspace as context).
2. **Settings → Networking → Generate Domain** (gives e.g. `https://hms-api-production.up.railway.app`).
3. **Variables** — add (values from your Neon/Stripe/etc. dashboards; see `apps/api/.env.example`):

   | Variable | Notes |
   |----------|-------|
   | `DATABASE_URL` | Neon **pooled** connection string (app runtime) |
   | `DIRECT_URL` | Neon **direct** connection — used by `prisma migrate deploy` |
   | `JWT_SECRET`, `JWT_REFRESH_SECRET` | random ≥32-char strings |
   | `JWT_EXPIRES_IN` (`15m`), `JWT_REFRESH_EXPIRES_IN` (`7d`) | optional, have defaults |
   | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | payments |
   | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME` | email (optional) |
   | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | SMS (optional) |
   | `NODE_ENV` = `production` | |
   | `TAX_RATE` = `10` | |
   | `CORS_ORIGINS` | set **after** the Vercel URLs exist (step 4) |

   > `PORT` is injected by Railway automatically — do **not** set it. The app reads `process.env.PORT`.
4. Deploy. The container runs `prisma migrate deploy` then `node apps/api/dist/src/main.js`.
   Logs should show the migration applied, all modules initialized, and `NotificationsGateway subscribed`.

---

## 2) Vercel — Admin (`@hms/web`)

1. **New Project → import the repo**.
2. **Root Directory = `Hotel-Manager/apps/web`** (build/install/output come from `apps/web/vercel.json`).
3. **Environment Variables**:
   - `VITE_API_URL` = `<railway-api-domain>/api/v1`  (e.g. `https://hms-api-production.up.railway.app/api/v1` — **include** `/api/v1`)
   - `VITE_SOCKET_URL` = `<railway-api-domain>`  (bare origin, **no** `/api/v1` — Socket.IO connects to the root)
   - `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_...`  (optional, for guest payment flows)
   > Vite inlines `VITE_*` at **build time** — set them before deploying, and redeploy if they change.
4. Deploy → note the URL (e.g. `https://hms-admin.vercel.app`).

## 3) Vercel — Landing (`@hms/guest`)

1. **New Project → import the same repo**.
2. **Root Directory = `Hotel-Manager/apps/guest`**.
3. **Environment Variables**:
   - `VITE_API_URL` = `<railway-api-domain>/api/v1`
   - `VITE_PORTAL_URL` = `<vercel-admin-url>` (the **Login** button links here)
   - `VITE_ENABLE_BOOKING_API` = `true` only once you want the landing's booking form to call the API
4. Deploy → note the URL (e.g. `https://cestlastay.com` once the domain is attached).

---

## 4) Wire-up order (important)

Because the URLs reference each other, do it in this order:

1. Deploy **API** (Railway) → copy its domain.
2. Set `VITE_API_URL` in **both** Vercel projects → deploy **admin**, then **landing** → copy both URLs.
3. Back on **Railway**, set `CORS_ORIGINS` to both Vercel URLs (comma-separated, no trailing slash):
   `CORS_ORIGINS="https://app.cestlastay.com,https://cestlastay.com"`
4. **Redeploy the API** so the new CORS list takes effect.

---

## 5) Verify

- `GET <railway-api-domain>/api/v1/...` responds (not 502); Railway logs show migrations + websocket gateway up.
- Admin loads; `/login` works with no CORS errors in the browser console.
- Landing loads; **Login** navigates to the admin URL; Socket.IO connects; if `VITE_ENABLE_BOOKING_API=true`, a booking request succeeds cross-origin (no CORS error).

## Notes / future hardening
- The API Docker image installs the full workspace for simplicity. To slim it later, use a filtered install or `pnpm deploy`.
- `prisma migrate deploy` runs on every container start (idempotent). With multiple replicas, move migrations to a release step.
