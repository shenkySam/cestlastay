# Hotel Management System - Implementation Plan

## Project Overview

A comprehensive web-based Hotel Management System designed to streamline daily operations, manage staff, handle room inventory, and elevate the guest experience through role-based access controls, real-time notifications, and automated CRM.

### Business Goals
- Reduce dependency on OTA platforms by building direct booking loyalty
- Automate manual workflows (housekeeping, service requests, billing)
- Provide guests with modern self-service capabilities
- Centralize operations from multiple booking sources

### Timeline
**6-8 week MVP** covering core operations (Phases 1-4), with CRM automation, OTA management, and analytics as priority features.

---

## Core Features

### 1. Admin Control Panel (Superuser)
- Full CRUD privileges across the entire platform
- Staff management (add, remove, manage permissions)
- Real-time notifications for check-ins and complaints
- CRM oversight dashboard (email logs, loyalty metrics)

### 2. Staff Portal & Operations (Front Desk)
- Secure authentication with session management
- Manual entry module for OTA bookings (Booking.com, MakeMyTrip)
- Live room availability dashboard with occupancy status
- Check-in/check-out processing
- Automated housekeeping alerts and scheduling

### 3. Guest Experience Portal
- Frictionless access via unique Booking ID (no account required)
- Digital service requests (room service, housekeeping, maintenance)
- Live billing view with running charges
- Integrated payment gateway for express checkout

### 4. Automated CRM & Marketing
- Trigger-based email and SMS system
- Welcome emails with guest portal link on check-in
- Post-stay emails (24h after checkout) with loyalty discount codes
- Automated check-in reminders

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Infrastructure, authentication, and project structure

**Deliverables:**
- ✅ Turborepo monorepo with pnpm workspaces
- ✅ NestJS backend with Prisma + PostgreSQL (Neon)
- ✅ Complete database schema and migrations
- ✅ Authentication system (JWT + role-based guards)
- ✅ React frontend with protected routes
- ✅ Login/logout for Admin, Staff, Guest roles

**Critical Files:**
- `turbo.json` - Monorepo configuration
- `apps/api/prisma/schema.prisma` - Database schema
- `apps/api/src/modules/auth/` - Authentication module
- `apps/web/src/contexts/AuthContext.tsx` - Frontend auth

---

### Phase 2: Room & Booking Management (Week 3-4)
**Goal:** Core booking engine with real-time availability

**Deliverables:**
- ✅ Room CRUD with categories and status management
- ✅ Booking creation with availability validation
- ✅ Real-time room dashboard (WebSocket updates)
- ✅ Guest profile management
- ✅ Booking list view with filters
- ✅ Check-in/check-out workflows
- ✅ Staff management (admin)

**Critical Files:**
- `apps/api/src/modules/rooms/` - Rooms module
- `apps/api/src/modules/bookings/` - Bookings module
- `apps/api/src/modules/guests/` - Guests module
- `apps/web/src/pages/staff/RoomDashboardPage.tsx` - Room dashboard

---

### Phase 3: Service Requests & Housekeeping (Week 5)
**Goal:** Service ticketing and automated housekeeping

**Deliverables:**
- ✅ Service request ticketing system
- ✅ Real-time notifications for staff
- ✅ Automated housekeeping task creation on checkout
- ✅ Task assignment and completion tracking
- ✅ Room status auto-update after cleaning

**Critical Files:**
- `apps/api/src/modules/services/` - Service requests module
- `apps/api/src/modules/housekeeping/` - Housekeeping module
- `apps/web/src/pages/guest/ServiceRequestPage.tsx` - Guest request form

---

### Phase 4: Billing & Payments (Week 6) ✅ Complete
**Goal:** Invoice generation and Stripe payment processing

**Deliverables:**
- ✅ Auto-generated invoices for bookings (10% tax, line items, `INV-YYYYMMDD-XXXX`)
- ✅ Stripe PaymentIntent integration (`apiVersion: 2025-02-24.acacia`)
- ✅ Webhook handler for `payment_intent.succeeded` (creates Payment, updates Invoice status)
- ✅ Guest payment portal with inline Stripe Elements
- ✅ Admin payments dashboard with revenue stats
- ⬜ Email receipts on successful payment (deferred to Phase 5 CRM)

**Critical Files:**
- `apps/api/src/modules/invoices/` - InvoicesModule + Controller + Service
- `apps/api/src/modules/payments/` - PaymentsModule with Stripe + webhook
- `apps/web/src/pages/guest/BillPage.tsx` - Guest invoice + Stripe payment form
- `apps/web/src/pages/admin/PaymentsPage.tsx` - Admin payment history & revenue
- `apps/api/src/main.ts` - `rawBody: true` for webhook signature verification

---

### Phase 5: CRM & Email Automation (Week 7) ✅ Complete
**Goal:** Automated email campaigns via SendGrid

**Deliverables:**
- ✅ SendGrid email automation (with fail-soft stub mode for local dev)
- ✅ Booking confirmation emails (fire on `POST /bookings`)
- ✅ Check-in reminders (daily 09:00 cron, T-1 day)
- ✅ Post-stay emails with auto-generated `LOYAL-XXXX` discount codes (daily 11:00 cron, T+1 after checkout)
- ✅ Admin CRM dashboard: email logs (filter + stats), discount-code CRUD, trigger overview
- ✅ HTML email templates (booking confirmation, check-in reminder, loyalty discount)

> Note: In-app WebSocket notifications were built in Phase 3.

**Critical Files:**
- `apps/api/src/modules/crm/crm.module.ts` - CrmModule
- `apps/api/src/modules/crm/email.service.ts` - SendGrid wrapper + EmailLog persistence
- `apps/api/src/modules/crm/crm.service.ts` - Triggers, cron jobs, discount-code logic
- `apps/api/src/modules/crm/email-templates.ts` - HTML templates
- `apps/api/src/modules/crm/crm.controller.ts` - `/crm/emails` and `/crm/discount-codes` routes
- `apps/web/src/pages/admin/CrmPage.tsx` - 3-tab admin dashboard

---

### Phase 6: OTA Management & Analytics (Week 8) ✅ Complete
**Goal:** Manual entry of third-party bookings + revenue analytics

**Deliverables:**
- ✅ OTA booking entry form for staff (Booking.com, Airbnb, Expedia, Agoda, Other OTA)
- ✅ OTA source tracking via existing `BookingSource` enum + `otaBookingId` reference
- ✅ Commission calculation (default rates per platform, manual override supported)
- ✅ OTA revenue report (gross, commission, net) by source
- ✅ Admin analytics dashboard: occupancy rate, ADR, RevPAR, daily revenue/occupancy charts, bookings-by-source, top-rooms

**Critical Files:**
- `apps/api/src/modules/ota/` - OtaModule + Controller + Service (POST /ota/bookings, GET /ota/bookings, GET /ota/revenue)
- `apps/api/src/modules/analytics/` - AnalyticsModule with overview/revenue-by-day/occupancy-by-day/bookings-by-source/top-rooms endpoints
- `apps/web/src/pages/staff/OtaBookingsPage.tsx` - OTA entry form, source-filtered list, revenue summary
- `apps/web/src/pages/admin/AnalyticsPage.tsx` - Stats cards, inline SVG bar charts (revenue/occupancy), source breakdown, top rooms

---

## Success Metrics

### Phase Completion Criteria
- Phase 1: All three roles can login and see role-specific dashboards
- Phase 2: Staff can create and manage bookings with real-time room updates
- Phase 3: Guests can submit service requests, staff receive real-time notifications
- Phase 4: Guests can pay invoices online, payment confirmation emails sent
- Phase 5: Automated emails working (booking confirmation, post-stay discount)
- Phase 6: OTA bookings can be entered and tracked

### MVP Success (End of Week 8)
- [ ] Admin can manage staff, rooms, and view analytics
- [ ] Staff can create bookings, manage check-in/out, handle service requests
- [ ] Guests can access portal, request services, pay invoices
- [ ] Real-time notifications functional for all critical events
- [ ] Automated welcome and loyalty emails sending
- [ ] OTA bookings can be manually entered
- [ ] System deployed to production (Vercel + Railway)
- [ ] All manual test scenarios pass

---

## Related Documentation

- [Tech Stack & Architecture](./tech-stack.md) - Technology decisions and rationale
- [Database Schema](./database-schema.md) - Complete database structure
- [API Endpoints](./api-endpoints.md) - REST API documentation
- [Project Structure](./project-structure.md) - Folder organization
- [Setup Guide](./setup-guide.md) - Installation and configuration
- [WebSocket Events](./websocket-events.md) - Real-time event documentation
- [CRM Automation](./crm-automation.md) - Email trigger system
- [Testing Guide](./testing-guide.md) - Manual testing scenarios

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp apps/api/.env.example apps/api/.env
# Edit .env with your Neon (DATABASE_URL + DIRECT_URL), Stripe, SendGrid credentials

# Initialize database
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed

# Start dev servers
cd ../..
pnpm dev
```

---

## Team & Support

**Project Lead:** To be assigned
**Timeline:** 6-8 weeks (MVP)
**Deployment:** Vercel (frontend) + Railway (backend)

For detailed implementation guidance, refer to the individual documentation files listed above.
