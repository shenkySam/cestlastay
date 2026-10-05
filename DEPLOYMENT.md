# Deployment Guide

This monorepo deploys as **three independent services** that connect at runtime via URLs:

| App | Path | Platform | Why |
|-----|------|----------|-----|
| **API** (`@hms/api`) | `apps/api` | **Railway** | Long-running NestJS server: Socket.IO websockets + `@Cron` jobs + Prisma. Needs an always-on process. |
| **Admin / portal** (`@hms/web`) | `apps/web` | **Vercel** | Static React/Vite SPA. |
| **Landing** (`@hms/guest`) | `apps/guest` | **Vercel** | Static C'est La Stay landing: hand-written `index.html` + plain scripts in `public/` (`site.js`, `earthen-init.js`, …), built/copied by Vite. Its **Login** button → the admin URL. |

> The repo root (`cestlastay`) has no app in it. **Every service must point at a subdirectory** —
> that is why the first Railway deploy failed. Config files in this repo:
> `railway.json` (root), `apps/web/vercel.json`, `apps/guest/vercel.json`, `apps/api/Dockerfile`.

Push to GitHub first (Railway & Vercel deploy from the repo).

### Live values (current)

| Service | URL / value |
|---------|-------------|
| **API** (Railway) | `https://cestlastay-production.up.railway.app` |
| **API base path** | `https://cestlastay-production.up.railway.app/api/v1` |
| **Landing** | `https://cestlastay.com` (+ `https://www.cestlastay.com`) |
| **Admin/portal** | `https://app.cestlastay.com` |

Required env for the public booking + newsletter to work:

- **Railway (API):** `CORS_ORIGINS="https://cestlastay.com,https://www.cestlastay.com,https://app.cestlastay.com"`
- **Vercel (guest):** nothing. The live landing does **not** read `VITE_*` vars. `public/site.js` hardcodes the API base: `http://localhost:3000/api/v1` on localhost, otherwise `https://cestlastay-production.up.railway.app/api/v1`. The prod **Login** URL (`https://app.cestlastay.com/login?as=guest`) is in `index.html`, swapped to `localhost:5173` in dev. If the Railway domain changes, edit `site.js`. The `VITE_*` vars in `apps/guest/.env.example` only feed the unused React app under `apps/guest/src/`.

`CORS_ORIGINS` is read at API boot — redeploy/restart the API after changing it.

**Email (`stay@cestlastay.com`):** inbound mail is received by **Resend** and forwarded to the team by the API (see [§6](#6-inbound-email--stay-forwarding-resend)). Outbound transactional mail (booking confirmation, reminders) still goes through **SendGrid**. The BIMI sender logo is served from the landing at `https://cestlastay.com/bimi-logo.svg` ([§7](#7-bimi-sender-logo)).

---

## 1) Railway — API

1. Open the failing service → **Settings → Source** → leave **Root Directory** empty (repo root), Save.
   - Railway then finds `railway.json` at the repo root, which builds `apps/api/Dockerfile` (whole workspace as context).
2. **Settings → Networking → Generate Domain** (gives e.g. `https://hms-api-production.up.railway.app`).
3. **Variables** — add (values from your Neon/Stripe/etc. dashboards; see `apps/api/.env.example`):

   | Variable | Notes |
   |----------|-------|
   | `DATABASE_URL` | Neon **pooled** connection string (app runtime) |
   | `DIRECT_URL` | Neon **direct** connection — used by `prisma migrate deploy` |
   | `JWT_SECRET`, `JWT_REFRESH_SECRET` | random ≥32-char strings |
   | `JWT_EXPIRES_IN` (`15m`), `JWT_REFRESH_EXPIRES_IN` (`7d`) | optional, have defaults |
   | `GOOGLE_CLIENT_ID` | Google OAuth **Web** client ID — staff sign in with Google/Apple only, and guests can use Google too. Add the admin web app origin under *Authorized JavaScript origins*. The OAuth consent screen must be **In production** (not *Testing*), or only listed test users — not guests — can sign in; the basic scopes (openid, email, profile) don't need Google verification |
   | `APPLE_CLIENT_ID` | Apple **Services ID** (Sign in with Apple). Register the admin web app domain + return URL `https://<admin-domain>/login` |
   | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | payments |
   | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME` | email (optional) |
   | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | SMS (optional) |
   | `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `RESEND_FORWARD_TO` | inbound `stay@` forwarding (optional; disabled with a startup warning if any is missing). `RESEND_FORWARD_TO` is a comma-separated list of inboxes. See §6 |
   | `RESEND_FORWARD_FROM` | optional, defaults to `C'est La Stay Inbox <stay@cestlastay.com>` |
   | `NODE_ENV` = `production` | |
   | `TAX_RATE` = `10` | |
   | `FRONTEND_URL` = `https://app.cestlastay.com` | admin/portal origin: used for the guest sign-in link in emails (`/login?as=guest`) and as the CORS fallback when `CORS_ORIGINS` is unset |
   | `CORS_ORIGINS` | set **after** the Vercel URLs exist (step 4). Applies to both HTTP and the Socket.IO handshake |

   > `PORT` is injected by Railway automatically — do **not** set it. The app reads `process.env.PORT`.
4. Deploy. The container runs `prisma migrate deploy` then `node apps/api/dist/src/main.js`.
   Logs should show the migration applied, all modules initialized, and `NotificationsGateway subscribed`.

---

## 2) Vercel — Admin (`@hms/web`)

1. **New Project → import the repo**.
2. **Root Directory = `apps/web`** (build/install/output come from `apps/web/vercel.json`).
3. **Environment Variables**:
   - `VITE_API_URL` = `<railway-api-domain>/api/v1`  (e.g. `https://hms-api-production.up.railway.app/api/v1` — **include** `/api/v1`)
   - `VITE_SOCKET_URL` = `<railway-api-domain>`  (bare origin, **no** `/api/v1` — Socket.IO connects to the root)
   - `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_...`  (optional, for guest payment flows)
   - `VITE_GOOGLE_CLIENT_ID`, `VITE_APPLE_CLIENT_ID` = same values as the API's `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` (a provider left unset is hidden on the login page — with neither set, nobody can sign in)
   > Vite inlines `VITE_*` at **build time** — set them before deploying, and redeploy if they change.
4. Deploy → note the URL (e.g. `https://hms-admin.vercel.app`).

## 3) Vercel — Landing (`@hms/guest`)

1. **New Project → import the same repo**.
2. **Root Directory = `apps/guest`**.
3. **Environment Variables**: none needed. The API base and the Login URL are hardcoded in `public/site.js` / `index.html` (see "Live values" above). Vercel still runs `vite build`, which copies `index.html` and `public/` into `dist/`.
4. Deploy → note the URL (e.g. `https://cestlastay.com` once the domain is attached).

---

## 4) Wire-up order (important)

Because the URLs reference each other, do it in this order:

1. Deploy **API** (Railway) → copy its domain.
2. Set `VITE_API_URL` / `VITE_SOCKET_URL` in the **admin** Vercel project (and update the hardcoded API base in `apps/guest/public/site.js` if the Railway domain is new) → deploy **admin**, then **landing** → copy both URLs.
3. Back on **Railway**, set `CORS_ORIGINS` to both Vercel URLs (comma-separated, no trailing slash):
   `CORS_ORIGINS="https://app.cestlastay.com,https://cestlastay.com"`
4. **Redeploy the API** so the new CORS list takes effect.

---

## 5) Verify

- `GET <railway-api-domain>/api/v1/...` responds (not 502); Railway logs show migrations + websocket gateway up.
- Admin loads; `/login` works with no CORS errors in the browser console.
- Landing loads; stay prices come from the API; **Login** navigates to the admin URL; a booking request and a newsletter signup succeed cross-origin (no CORS error).
- After logging into admin, Socket.IO connects (the landing itself opens no socket). A handshake rejected as `UNAUTHORIZED` in the console means `JWT_SECRET` differs from the one the token was signed with, or is unset.

---

## 6) Inbound email — `stay@` forwarding (Resend)

`stay@cestlastay.com` has no mailbox. Resend receives the mail and the API forwards it to the team (`POST /api/v1/webhooks/resend`; behaviour in `api-endpoints.md` → *Inbound Email*).

1. **Resend → Domains:** add `cestlastay.com`, enable **receiving**, and add the MX record Resend gives you at the DNS host.
2. **Resend → Webhooks:** create an endpoint `https://cestlastay-production.up.railway.app/api/v1/webhooks/resend` for the event **`email.received`**. Copy its signing secret (`whsec_…`).
3. **Resend → API Keys:** create a key that can send from `cestlastay.com`.
4. **Railway variables:** `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` (the `whsec_…` value), `RESEND_FORWARD_TO` (comma-separated team inboxes), and optionally `RESEND_FORWARD_FROM`. Restart the API.
5. **Verify:** mail `stay@cestlastay.com` from an outside account. It should arrive in each inbox as `[stay@] <subject>`, and **Reply** should go to the original sender. Railway logs show `Forwarded inbound email …`. A 401 in Resend's webhook log means the secret doesn't match.

Resend retries failed webhooks; forwards are sent with an idempotency key per email, so a retry never duplicates mail.

## 7) BIMI sender logo

`apps/guest/public/bimi-logo.svg` is served at `https://cestlastay.com/bimi-logo.svg` and referenced by the `default._bimi` DNS TXT record (`v=BIMI1; l=https://cestlastay.com/bimi-logo.svg`). It must stay **SVG Tiny PS**: no arcs, no width/height on the root, a `<title>`, under 32 KB. Re-validate it after any edit. BIMI only shows in inboxes when the domain's DMARC policy is `quarantine` or `reject`.

---

## Notes / future hardening
- The API Docker image installs the full workspace for simplicity. To slim it later, use a filtered install or `pnpm deploy`.
- `prisma migrate deploy` runs on every container start (idempotent). With multiple replicas, move migrations to a release step.
- Sign-in rate limits (`@nestjs/throttler`, per client IP) keep their counters in memory, which is right for the single API instance. With more than one replica each would count separately — switch the throttler to a shared Redis store first. The API sets `trust proxy` to 1 hop for Railway's proxy; if another proxy/CDN is put in front, raise it or every visitor will share one IP.
