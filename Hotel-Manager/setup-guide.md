# Setup Guide

Complete setup instructions for the Hotel Management System development environment.

---

## Prerequisites

Before starting, ensure you have the following installed:

### Required Software

1. **Node.js** (v20.x or later)
   ```bash
   node --version  # Should be v20.x or higher
   ```
   Download from: https://nodejs.org/

2. **pnpm** (v8.x or later)
   ```bash
   npm install -g pnpm
   pnpm --version
   ```

3. **Git**
   ```bash
   git --version
   ```

4. **VS Code** (Recommended IDE)
   - Extensions to install:
     - ESLint
     - Prettier
     - Prisma
     - Tailwind CSS IntelliSense

### Required Accounts

1. **Neon** (PostgreSQL database) — **required**
   - Create a free project at: https://neon.tech
   - Copy the **pooled** connection string (`DATABASE_URL`) and the **direct** connection string (`DIRECT_URL`)
   - > The schema is standard PostgreSQL — any Postgres host works (Neon, Supabase, or a local Postgres). Only `DATABASE_URL` / `DIRECT_URL` change. This guide uses Neon.

2. **Stripe** (Payment Processing) — optional for local dev
   - Create account at: https://stripe.com (test mode)
   - Without a key, set `STRIPE_SECRET_KEY="sk_test_placeholder"` so the API boots (an empty string crashes it)

3. **SendGrid** (Email Service) — optional
   - https://sendgrid.com — free tier 100 emails/day
   - Without a key, emails run in **stub mode** (logged, not sent)

4. **Twilio** (Optional - SMS)
   - https://twilio.com — pay-as-you-go

---

## Initial Setup

### 1. Clone Repository

```bash
# If starting fresh
mkdir hotel-management-system
cd hotel-management-system
git init

# If cloning existing repo
git clone <repository-url>
cd hotel-management-system
```

---

### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

This will install dependencies for:
- Root workspace
- `apps/api` (NestJS backend)
- `apps/web` (React frontend)
- `packages/shared` (Shared code)

---

### 3. Setup Environment Variables

#### Backend Environment (`apps/api/.env`)

```bash
# Copy example file
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

```env
# ===========================================
# DATABASE (PostgreSQL — Neon)
# ===========================================
# DATABASE_URL = pooled connection (used by the running app)
# DIRECT_URL   = direct connection (used by `prisma migrate`) — required, schema declares directUrl
# Get both from the Neon dashboard > Connection Details (toggle "Pooled connection").
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require"

# (Any Postgres host works — Neon, Supabase, or local. Only these two URLs change.)
# The SUPABASE_* vars below are LEGACY/UNUSED — the app uses custom JWT auth, not Supabase Auth.
# Leave them blank/omit unless you intentionally run on Supabase.


# ===========================================
# JWT TOKENS
# ===========================================
JWT_SECRET="your-custom-jwt-secret-min-32-chars"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-token-secret-min-32-chars"
JWT_REFRESH_EXPIRES_IN="7d"

# Generate secrets:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"


# ===========================================
# STRIPE PAYMENT
# ===========================================
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Get from: Stripe Dashboard > Developers > API keys
# Webhook secret: Create webhook endpoint first, then get secret


# ===========================================
# SENDGRID EMAIL
# ===========================================
SENDGRID_API_KEY="SG...."
SENDGRID_FROM_EMAIL="noreply@yourhotel.com"
SENDGRID_FROM_NAME="Your Hotel Name"

# Get from: SendGrid Dashboard > Settings > API Keys
# Must verify sender email first


# ===========================================
# TWILIO SMS (Optional)
# ===========================================
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1234567890"

# Get from: Twilio Console > Account Info


# ===========================================
# APPLICATION SETTINGS
# ===========================================
NODE_ENV="development"
PORT=3000
FRONTEND_URL="http://localhost:5173"

# CORS origins (comma-separated for multiple)
CORS_ORIGINS="http://localhost:5173,http://localhost:3000"


# ===========================================
# REDIS (Optional - for production scaling)
# ===========================================
REDIS_URL="redis://localhost:6379"

# Optional: For Socket.IO scaling with Redis adapter
```

---

#### Frontend Environment (`apps/web/.env`)

```bash
# Copy example file
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env`:

```env
# API Backend URL
VITE_API_URL="http://localhost:3000/api/v1"

# WebSocket URL (for Socket.IO)
VITE_SOCKET_URL="http://localhost:3000"

# Stripe Publishable Key (public, safe to expose)
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# App Settings
VITE_APP_NAME="C'est La Stay"
VITE_APP_VERSION="1.0.0"
```

#### Guest Landing Environment (`apps/guest/.env`)

```bash
cp apps/guest/.env.example apps/guest/.env
```

```env
# Base URL of the API (only used when the booking flag below is ON)
VITE_API_URL="http://localhost:3000/api/v1"

# Booking form is OFF by default. Flip to true to wire it to POST /bookings/public.
VITE_ENABLE_BOOKING_API=false

# The portal (apps/web) — the landing's "Login" link points at ${VITE_PORTAL_URL}/guest-portal
VITE_PORTAL_URL="http://localhost:5173"
```

---

## Database Configuration (Neon)

### 1. Create a Neon Project

1. Go to https://console.neon.tech and create a project (pick a region close to where the API runs).
2. On the project dashboard, open **Connection Details**.

### 2. Copy both connection strings

- **Pooled** connection (toggle "Pooled connection" ON) → `DATABASE_URL`
- **Direct** connection (toggle OFF / "Direct") → `DIRECT_URL`

Paste both into `apps/api/.env`. That's the only DB setup needed — the app uses custom JWT auth, so there are no Supabase-style auth keys to configure.

> **Using a different Postgres host?** Supabase or a local Postgres work identically — just set `DATABASE_URL` and `DIRECT_URL` to that host. For local Postgres they can be the same URL.

---

## Database Setup

### 1. Initialize Prisma

```bash
cd apps/api
npx prisma generate
```

This generates the Prisma Client based on your schema.

### 2. Run Migrations

```bash
# Create and apply initial migration
npx prisma migrate dev --name init
```

This will:
- Create all database tables
- Set up relationships
- Apply indexes

### 3. Seed Database (Optional)

```bash
# from apps/api
pnpm prisma:seed          # or: npx ts-node prisma/seed.ts
```

The seed is upsert-safe (re-runnable). It creates:
- 1 Admin (`admin@hotel.com`)
- 2 Staff (front desk `staff@hotel.com`, housekeeping `housekeeping@hotel.com`)
- 1 System user (`system@hotel.com`, non-login — owns public/self-service bookings)
- 1 Guest (`guest@hotel.com`) — note: guests normally access via the booking portal, not email/password
- 3 Room categories, 7 rooms
- 1 sample booking `BKG-20260501-0001` (+ its invoice `INV-20260501-0001`)

**Test Credentials:**
```
Admin:        admin@hotel.com        / Admin123!
Staff:        staff@hotel.com        / Staff123!
Housekeeping: housekeeping@hotel.com / Staff123!

Guest portal (apps/web → /guest-portal):
  Booking #:  BKG-20260501-0001
  Last name:  Smith
```

### 4. View Database (Optional)

```bash
npx prisma studio
```

Opens visual database browser at `http://localhost:5555`

---

## Stripe Configuration

### 1. Get API Keys

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy **Secret key** (starts with `sk_test_`)
3. Copy **Publishable key** (starts with `pk_test_`)
4. Add to `.env` files

### 2. Setup Webhook (After deploying backend)

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-backend-url.com/api/v1/payments/stripe/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
5. Copy **Signing secret** (starts with `whsec_`)
6. Add to `.env` as `STRIPE_WEBHOOK_SECRET`

**For local development:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/v1/payments/stripe/webhook
```

---

## SendGrid Configuration

### 1. Verify Sender Email

1. Go to: https://app.sendgrid.com/settings/sender_auth
2. Click "Create New Sender"
3. Fill in your email details
4. Verify email via link sent to your inbox

### 2. Create API Key

1. Go to: https://app.sendgrid.com/settings/api_keys
2. Click "Create API Key"
3. Name: `Hotel Management System`
4. Permissions: Full Access
5. Copy API key (starts with `SG.`)
6. Add to `.env` as `SENDGRID_API_KEY`

### 3. Create Email Templates

1. Go to: https://app.sendgrid.com/dynamic_templates
2. Create templates for:
   - Booking Confirmation
   - Check-In Reminder
   - Loyalty Discount

**Template Variables:**
- `{{guestName}}` - Guest first name
- `{{bookingNumber}}` - Booking number
- `{{checkInDate}}` - Check-in date
- `{{roomType}}` - Room category
- `{{discountCode}}` - Loyalty discount code
- `{{portalLink}}` - Guest portal link

---

## Start Development Servers

### Option 1: Start All Services (Recommended)

```bash
# From project root
pnpm dev
```

This starts all three apps:
- Backend API at `http://localhost:3000`
- Portal (admin/staff/guest) at `http://localhost:5173`
- Guest landing at `http://localhost:5174`

> `pnpm dev` uses turbo and runs the apps together — if one crashes (e.g. the API on a bad env var), turbo tears down the others. During backend iteration, prefer separate terminals (Option 2).

### Option 2: Start Services Individually

**Terminal 1 - Backend:**
```bash
cd apps/api
pnpm dev
```

**Terminal 2 - Portal:**
```bash
cd apps/web
pnpm dev
```

**Terminal 3 - Guest landing:**
```bash
cd apps/guest
pnpm dev
```

---

## Verify Setup

### 1. Check Backend

```bash
# Health check
curl http://localhost:3000/health

# Should return: { "status": "ok" }
```

### 2. Check Database Connection

```bash
cd apps/api
npx prisma studio
```

Should open browser with database viewer.

### 3. Test Frontend

Open browser: `http://localhost:5173`

Should see login page.

### 4. Test Login

Use test credentials:
```
Email: admin@hotel.com
Password: Admin123!
```

Should redirect to admin dashboard.

---

## Common Issues & Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
- Check `DATABASE_URL` in `.env`
- Ensure Supabase project is active
- Verify password in connection string
- Check if database is paused (free tier auto-pauses after inactivity)

```bash
# Test connection
cd apps/api
npx prisma db pull
```

---

### Issue: "Port 3000 already in use"

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in apps/api/.env
PORT=3001
```

---

### Issue: "pnpm: command not found"

**Solution:**
```bash
npm install -g pnpm
```

---

### Issue: "Prisma Client not generated"

**Solution:**
```bash
cd apps/api
npx prisma generate
```

---

### Issue: "Module not found" errors

**Solution:**
```bash
# Clean and reinstall
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

---

### Issue: "Stripe webhook signature verification failed"

**Solution:**
- Ensure `STRIPE_WEBHOOK_SECRET` is correct
- For local dev, use Stripe CLI forwarding
- Check that webhook endpoint matches your server URL

---

### Issue: "SendGrid emails not sending"

**Solution:**
- Verify sender email is verified in SendGrid
- Check API key is correct
- Look for errors in backend logs
- Check SendGrid Activity Feed for delivery status

---

## Next Steps

1. **Explore the codebase:** Start with `apps/api/src/main.ts` and `apps/web/src/App.tsx`
2. **Read documentation:**
   - [API Endpoints](./api-endpoints.md)
   - [Database Schema](./database-schema.md)
   - [Project Structure](./project-structure.md)
3. **Start Phase 1 development:** Follow implementation plan
4. **Run tests:** `pnpm test`
5. **Check code quality:** `pnpm lint`

---

## Development Best Practices

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/booking-system

# Make commits
git add .
git commit -m "feat: implement booking creation endpoint"

# Push to remote
git push origin feature/booking-system
```

### Commit Message Convention

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

### Code Quality Checks

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check

# Run tests
pnpm test
```

---

## Additional Tools (Optional)

### Redis (for production Socket.IO scaling)

```bash
# Install Redis
brew install redis  # macOS
# or: sudo apt-get install redis  # Linux

# Start Redis
redis-server
```

Add to `.env`:
```env
REDIS_URL="redis://localhost:6379"
```

### Docker (for containerization)

```bash
# Build containers
docker-compose up --build

# Stop containers
docker-compose down
```

---

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review error logs in terminal
3. Search GitHub issues
4. Ask in team chat

---

## Ready to Code!

Your development environment is now set up. Start with Phase 1:

```bash
# Ensure everything is running
pnpm dev

# Open in browser
open http://localhost:5173
```

Happy coding! 🚀
