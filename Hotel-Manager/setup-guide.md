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

1. **Neon** (PostgreSQL database)
   - Create account at: https://neon.tech
   - Free tier sufficient for development; grab the **pooled** and **direct** connection strings

2. **Stripe** (Payment Processing)
   - Create account at: https://stripe.com
   - Use test mode for development

3. **SendGrid** (Email Service)
   - Create account at: https://sendgrid.com
   - Free tier: 100 emails/day

4. **Twilio** (Optional - SMS)
   - Create account at: https://twilio.com
   - Pay-as-you-go pricing

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
- `apps/web` (React admin/staff/guest portal)
- `apps/guest` (React "C'est La Stay" public landing)
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
# DATABASE (Neon PostgreSQL)
# ===========================================
# Pooled connection — used by the app at runtime
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[ENDPOINT]-pooler.[REGION].aws.neon.tech/neondb?sslmode=require"
# Direct connection — used by `prisma migrate`
DIRECT_URL="postgresql://[USER]:[PASSWORD]@[ENDPOINT].[REGION].aws.neon.tech/neondb?sslmode=require"

# Get both from: Neon Dashboard > Connection Details
# (toggle "Pooled connection" for DATABASE_URL, off for DIRECT_URL)

# NOTE: SUPABASE_* keys may still appear in .env.example from an earlier
# iteration — they are NOT used. Prisma connects to Neon via the two URLs above.


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
VITE_APP_NAME="Hotel Management System"
VITE_APP_VERSION="1.0.0"
```

---

## Neon Configuration

### 1. Create Neon Project

1. Go to https://console.neon.tech
2. Click "New Project"
3. Fill in:
   - Project name: `hotel-management-system`
   - Postgres version + region: choose closest to you
4. Wait for the project to initialize (~seconds)

### 2. Get Connection Strings

Open **Dashboard > Connection Details** and copy **two** strings into `.env`:
- **Pooled connection** → `DATABASE_URL` (host contains `-pooler`)
- **Direct connection** (toggle "Pooled connection" off) → `DIRECT_URL`

Both end with `?sslmode=require`. Prisma uses `DATABASE_URL` at runtime and `DIRECT_URL` for migrations (configured in `apps/api/prisma/schema.prisma`).

> Auth is handled by the API itself (JWT + bcrypt) — there is no separate managed-auth provider to configure.

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
npx prisma db seed
```

This will create (upsert-safe, so it's repeatable):
- 1 Admin user (`admin@hotel.com` / `Admin123!`)
- 2 Staff users (Front Desk `staff@hotel.com`, Housekeeping `housekeeping@hotel.com` — both `Staff123!`)
- 1 System user (`system@hotel.com`) — used as `createdById` for public/online bookings
- 1 sample Guest profile (`guest@hotel.com`)
- 3 Room categories (Standard Single, Deluxe Double, Executive Suite)
- 7 Rooms (101, 102, 201, 202, 203, 301, 302)
- 1 Sample booking `BKG-20260501-0001` (+ its invoice)

**Test Credentials:**
```
Admin:        admin@hotel.com        / Admin123!
Staff:        staff@hotel.com        / Staff123!
Housekeeping: housekeeping@hotel.com / Staff123!
```
> Guests do not log in with email/password — the guest portal authenticates with
> **booking number + last name** (try `BKG-20260501-0001` / `Smith`).

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
3. Endpoint URL: `https://your-backend-url.com/api/v1/payments/webhook`
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
stripe listen --forward-to localhost:3000/api/v1/payments/webhook
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

This starts:
- Backend API at `http://localhost:3000` (base path `/api/v1`)
- Portal (web) at `http://localhost:5173`
- Landing (guest) at `http://localhost:5174`

### Option 2: Start Services Individually

**Terminal 1 - Backend:**
```bash
cd apps/api
pnpm dev
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
pnpm dev
```

---

## Verify Setup

### 1. Check Backend

On startup the API logs `HMS API running on http://localhost:3000/api/v1`.
There is no `/health` route; hit a public endpoint instead:

```bash
# Public endpoint — returns a JSON array of room categories
curl http://localhost:3000/api/v1/rooms/categories
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
- Check `DATABASE_URL` and `DIRECT_URL` in `.env`
- Verify the password / connection strings are current (Neon can rotate them)
- Ensure the URL ends with `?sslmode=require`
- After idle, Neon cold-starts on the first query — retry once

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
