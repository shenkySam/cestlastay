# HMS Codebase Context

This file captures the exact state of the codebase, key decisions, patterns, and what to do next. Read this at the start of every phase.

---

## Current Status

| Phase | What | Status |
|-------|------|--------|
| Phase 1 | Foundation — monorepo, auth, database, layouts, routing | ✅ Complete |
| Phase 2 | Rooms, Bookings, Guests, Check-in/out, Real-time dashboard | ✅ Complete |
| Phase 3 | Service Requests, Housekeeping, Notifications | ✅ Complete |
| Phase 4 | Invoices, Stripe Payments | ✅ Complete |
| Phase 5 | CRM, Email Automation | ✅ Complete |
| Phase 6 | OTA Management, Analytics | ✅ Complete |

---

## Monorepo Structure

```
Hotel Manager/
├── apps/
│   ├── api/          # NestJS backend — port 3000
│   └── web/          # React + Vite frontend — port 5173
├── packages/
│   └── shared/       # Shared TypeScript types and enums
├── turbo.json
└── pnpm-workspace.yaml
```

**Run everything:** `pnpm dev` from root (starts both api and web)
**Run API alone:** `cd apps/api && npx ts-node -r tsconfig-paths/register src/main.ts`
**Run Web alone:** `cd apps/web && pnpm dev`

---

## Backend Patterns (NestJS)

### How to add a new module

Every module follows the same structure:
```
apps/api/src/modules/<name>/
  ├── <name>.module.ts       # imports controller + service, exports service
  ├── <name>.controller.ts   # routes, guards, decorators
  ├── <name>.service.ts      # business logic, prisma calls
  └── dto/
      ├── create-<name>.dto.ts
      └── update-<name>.dto.ts
```

**After creating a module, always register it in `app.module.ts`.**

### Auth Guards — How they work

`JwtAuthGuard` and `RolesGuard` are registered as **global guards** in `AuthModule` via `APP_GUARD`. Every route is protected by default. Use `@Public()` to open a route.

```typescript
@Roles(UserRole.ADMIN)              // admin only
@Roles(UserRole.ADMIN, UserRole.STAFF)  // admin or staff
// no @Roles = any authenticated user
@Public()                           // no JWT required
```

### Prisma Service

`PrismaService` is globally available (`PrismaModule` is `@Global()`). Inject it in any service:
```typescript
constructor(private readonly prisma: PrismaService) {}
```

### DTO Validation

All DTOs use `class-validator`. Global `ValidationPipe` in `main.ts` handles validation. Use `@IsOptional()` for update DTOs.

---

## Database

**Provider:** Supabase (PostgreSQL)
**Connection:** Session Pooler URL (IPv4 compatible) — see `apps/api/.env`
**ORM:** Prisma — schema at `apps/api/prisma/schema.prisma`

> ⚠️ Supabase free-tier projects auto-pause after ~1 week of inactivity. If the API crashes with `P1001 Can't reach database`, the project needs to be restored from the Supabase dashboard. Do NOT restart the project while the May 2026 systemd outage warning is active.

### Key tables

| Table | Key Fields | Notes |
|-------|-----------|-------|
| `users` | id, email, role (ADMIN/STAFF/GUEST), status | All user types in one table |
| `staff` | id, userId, employeeId, department | Extension of users for STAFF role. `id` is what `assignedToId` references in service_requests and housekeeping_tasks |
| `guests` | userId (nullable), firstName, lastName, email, phone | Can exist without user account (walk-ins) |
| `room_categories` | name, type, basePrice, maxOccupancy, amenities[] | Room types |
| `rooms` | roomNumber, categoryId, floor, status | Status: AVAILABLE/OCCUPIED/RESERVED/MAINTENANCE/CLEANING/OUT_OF_ORDER |
| `bookings` | bookingNumber, guestId, roomId, checkInDate, checkOutDate, status, source | Format: `BKG-YYYYMMDD-XXXX` |
| `service_requests` | ticketNumber, guestId, bookingId, type, status, priority, assignedToId | assignedToId → staff.id. Format: `SRV-YYYYMMDD-XXXX` |
| `housekeeping_tasks` | roomId, assignedToId, taskType, status, scheduledFor | assignedToId → staff.id. taskType: checkout_cleaning / daily_cleaning / deep_cleaning |
| `invoices` | bookingId (unique), status, subtotal, taxAmount, totalAmount, balanceDue | One invoice per booking |
| `invoice_items` | invoiceId, description, quantity, unitPrice, totalPrice | Line items |
| `payments` | invoiceId, amount, method, status, stripePaymentId | Stripe payment records |
| `notifications` | userId, type, status (UNREAD/READ), title, message, link | userId → users.id (not guests.id) |
| `email_logs` | recipientEmail, type, status, sendgridId | CRM email tracking |
| `loyalty_discounts` | code, discountType, discountValue, validFrom, validUntil | Post-stay discount codes |

### Migrations

```bash
cd apps/api
npx prisma migrate dev --name <description>   # create + apply migration
npx prisma generate                            # regenerate client after schema change
npx prisma studio                              # visual DB browser at localhost:5555
npx ts-node prisma/seed.ts                    # re-run seed (uses upsert, safe to repeat)
```

### Seed Data

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Admin | admin@hotel.com | Admin123! | Full access |
| Staff (Front Desk) | staff@hotel.com | Staff123! | employeeId: EMP001 |
| Staff (Housekeeping) | housekeeping@hotel.com | Staff123! | employeeId: EMP002 |

| Room # | Category | Floor | Status |
|--------|----------|-------|--------|
| 101 | Standard Single ($80) | 1 | AVAILABLE |
| 102 | Standard Single ($80) | 1 | AVAILABLE |
| 201 | Deluxe Double ($150) | 2 | AVAILABLE |
| 202 | Deluxe Double ($150) | 2 | OCCUPIED |
| 203 | Deluxe Double ($150) | 2 | CLEANING |
| 301 | Executive Suite ($300) | 3 | AVAILABLE |
| 302 | Executive Suite ($300) | 3 | MAINTENANCE |

**Sample booking:** `BKG-20260501-0001` — Guest: John Smith, Room 201, May 1–5 2026, status CONFIRMED
**Guest Portal test:** bookingNumber=`BKG-20260501-0001`, lastName=`Smith`

---

## Frontend Patterns (React)

### Routing Architecture

React Router v6 nested routes with `Outlet`.

```
/login              → LoginPage (public)
/guest-portal       → GuestPortalPage (public — booking number + last name)

/admin              → ProtectedRoute(ADMIN) → AdminLayout
  /admin/           → AdminDashboardPage ✅
  /admin/staff      → AdminStaffPage ✅
  /admin/rooms      → AdminRoomsPage ✅
  /admin/bookings   → AdminBookingsPage ✅
  /admin/guests     → AdminGuestsPage ✅
  /admin/analytics  → AdminAnalyticsPage ✅
  /admin/crm        → AdminCrmPage ✅
  /admin/payments   → AdminPaymentsPage ✅

/staff              → ProtectedRoute(STAFF|ADMIN) → StaffLayout
  /staff/           → StaffDashboardPage ✅
  /staff/rooms      → StaffRoomDashboardPage ✅
  /staff/bookings   → StaffBookingsPage ✅
  /staff/checkin    → StaffCheckInPage ✅
  /staff/services   → StaffServiceQueuePage ✅
  /staff/housekeeping → StaffHousekeepingPage ✅
  /staff/guests     → StaffGuestsPage ✅
  /staff/ota        → StaffOtaBookingsPage ✅

/guest              → ProtectedRoute(GUEST) → GuestLayout
  /guest/home       → GuestHomePage ✅
  /guest/services   → GuestServiceRequestPage ✅
  /guest/complaints → GuestServiceRequestPage ✅ (reuses same page)
  /guest/bill       → GuestBillPage ✅
```

### API calls

```typescript
import api from '@/lib/api';

const { data } = await api.get('/rooms', { params: { status: 'AVAILABLE' } });
const { data } = await api.post('/bookings', { guestId, roomId, checkInDate, ... });
await api.patch(`/rooms/${id}/status`, { status: 'MAINTENANCE' });
```

404 errors are silenced. All other non-401 errors show a toast automatically.

### Auth state

```typescript
const { user, isRole, logout } = useAuth();
if (isRole(UserRole.ADMIN)) { ... }
// user.id, user.firstName, user.role, user.staff?.employeeId, user.guest?.id
```

### Guest auth — important differences

- Guests use `guestLogin(bookingNumber, lastName)` → `POST /auth/guest-portal`
- Gets a 24h token, no refresh token
- Token has `sub = guestId` (not a userId) — `GET /auth/me` does NOT work for guests
- On boot, guest session is restored from `localStorage.guestUser` (set at login), NOT from `/auth/me`
- On logout, redirects to `/guest-portal` not `/login`
- `NotificationContext` skips all API calls for guests (`user.role === GUEST`)

### Staff assignment dropdowns (services + housekeeping)

Both pages call `GET /users/staff-list` (not `GET /users`) — this endpoint is accessible to STAFF role and returns only `{ id, firstName, lastName, staff: { id, department } }`. The option **value must be `staff.id`** (the Staff table row ID), not the user ID, since `assignedToId` references the `staff` table.

### Shared types

```typescript
import { UserRole, BookingStatus, RoomStatus, IBooking, IRoom } from '@shared/index';
```

### Styling conventions

- Tailwind utility classes
- Custom components in `globals.css`: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input`, `.card`, `.badge`, `.badge-green`, `.badge-red`, `.badge-yellow`, `.badge-blue`, `.badge-gray`
- Page layout: `<div className="space-y-6">` as root wrapper

---

## Socket.IO Architecture

**Single gateway** (`NotificationsGateway`) handles all real-time events on the default namespace `/`. `RoomsGateway` and `BookingsGateway` are thin wrappers that delegate to it.

**Events emitted by server:**
- `room:status-changed` — broadcast to all clients when any room status changes
- `booking:checked-in` — broadcast on check-in
- `booking:checked-out` — broadcast on check-out
- `notification:new` — targeted to `user:<userId>` room

**Client subscription flow:**
```typescript
socket.emit('subscribe', { userId: user.id });   // join user:<userId> room
socket.on('notification:new', (n) => { ... });
```

Guests do NOT subscribe (skipped in `NotificationContext` because their token sub ≠ userId).

---

## Known Issues / Tech Debt

1. **API dev server has no hot reload** — `dev` script uses `ts-node` directly. Restart required after any backend change. To add hot reload: `ts-node-dev --respawn -r tsconfig-paths/register src/main.ts`.

2. **Seed `guest@hotel.com` user unnecessary** — has no purpose since guests access via booking ID. Safe to ignore.

3. **Pre-existing TypeScript errors in web** — `ImportMeta.env` typing and one `UserStatus` literal error in `AuthContext.tsx` exist from Phase 1. They don't affect runtime (Vite handles `import.meta.env`).

4. **CRM emails fail-soft** — when `SENDGRID_API_KEY` is not configured (or doesn't start with `SG.`), `EmailService` falls back to STUB mode: logs are still written to `email_logs` with `status=SENT` and the email body is logged via `Logger`, but no real email is sent. This keeps Phase 5 functional during local dev.

---

## Environment Variables Reference

```env
# apps/api/.env
DATABASE_URL=           # Supabase session pooler URI (IPv4 compatible)
JWT_SECRET=             # Random 32+ char string
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=     # Different random 32+ char string
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
PORT=3000

# Phase 4 additions
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=

# Phase 5 additions
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=

# apps/web/.env
VITE_API_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
VITE_STRIPE_PUBLISHABLE_KEY=   # Phase 4
```
