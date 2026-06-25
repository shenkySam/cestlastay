# Project Structure

Actual folder hierarchy as built. Only files that exist are listed.

---

## Root

```
Hotel-Manager/
├── apps/
│   ├── api/              # NestJS backend — port 3000 (REST + Socket.IO)
│   ├── web/              # React + Vite admin/staff/guest portal — port 5173
│   └── guest/            # React + Vite "C'est La Stay" public landing — port 5174
├── packages/
│   └── shared/           # Shared TypeScript types and enums
├── docs/                 # ADRs + SEO plan
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Backend (`apps/api/`)

```
apps/api/
├── src/
│   ├── main.ts                         # Entry point — IoAdapter, CORS, ValidationPipe, rawBody=true (Stripe webhook)
│   ├── app.module.ts                   # Root module — registers all feature modules
│   │
│   ├── common/
│   │   └── cors.ts                     # getCorsOrigins() — shared CORS allow-list (HTTP + WS)
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts            # @Global() module
│   │   └── prisma.service.ts           # PrismaClient wrapper
│   │
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts          # Registers JwtAuthGuard + RolesGuard as APP_GUARD (global)
│       │   ├── auth.controller.ts      # /auth/register, /login, /guest-portal, /refresh, /me, /logout
│       │   ├── auth.service.ts         # JWT signing, bcrypt, guest portal access
│       │   ├── strategies/
│       │   │   └── jwt.strategy.ts     # Validates JWT, looks up user in DB
│       │   ├── guards/
│       │   │   ├── jwt-auth.guard.ts
│       │   │   └── roles.guard.ts      # Allows through if no @Roles decorator
│       │   ├── decorators/
│       │   │   ├── roles.decorator.ts
│       │   │   ├── current-user.decorator.ts
│       │   │   └── public.decorator.ts
│       │   └── dto/
│       │       ├── register.dto.ts
│       │       ├── login.dto.ts
│       │       └── guest-portal.dto.ts
│       │
│       ├── users/
│       │   ├── users.module.ts         # Imports AuthModule to access AuthService
│       │   ├── users.controller.ts     # /users, /users/staff-list, /users/:id
│       │   ├── users.service.ts        # findAll, findStaffList, findOne, update, updateStatus, remove
│       │   └── dto/
│       │       └── update-user.dto.ts  # UpdateUserDto, UpdateUserStatusDto
│       │
│       ├── notifications/              # Must be registered BEFORE rooms/bookings/services/housekeeping
│       │   ├── notifications.module.ts # Exports NotificationsService + NotificationsGateway
│       │   ├── notifications.controller.ts  # /notifications, /notifications/read-all, /notifications/:id/read
│       │   ├── notifications.service.ts     # notifyUser(), notifyStaff(), findForUser(), markRead()
│       │   └── notifications.gateway.ts    # Single Socket.IO gateway — handles all WS events
│       │                                   # emitRoomStatusChanged, emitCheckedIn, emitCheckedOut, sendToUser
│       │
│       ├── rooms/
│       │   ├── rooms.module.ts         # Imports NotificationsModule
│       │   ├── rooms.controller.ts     # /rooms/categories, /rooms/availability, /rooms, /rooms/:id/status
│       │   ├── rooms.service.ts        # CRUD + availability check
│       │   ├── rooms.gateway.ts        # Thin wrapper — delegates to NotificationsGateway
│       │   └── dto/
│       │       ├── create-room.dto.ts
│       │       ├── update-room.dto.ts
│       │       ├── update-room-status.dto.ts
│       │       ├── create-room-category.dto.ts
│       │       └── update-room-category.dto.ts
│       │
│       ├── guests/
│       │   ├── guests.module.ts
│       │   ├── guests.controller.ts    # /guests, /guests/:id, /guests/:id/bookings
│       │   ├── guests.service.ts       # CRUD + findOrCreate
│       │   └── dto/
│       │       ├── create-guest.dto.ts
│       │       └── update-guest.dto.ts
│       │
│       ├── bookings/
│       │   ├── bookings.module.ts      # Imports NotificationsModule
│       │   ├── bookings.controller.ts  # /bookings, /bookings/:id/check-in, /check-out, /cancel
│       │   ├── bookings.service.ts     # create (overlap check), checkIn, checkOut (auto-HK task), cancel
│       │   ├── bookings.gateway.ts     # Thin wrapper — delegates to NotificationsGateway
│       │   └── dto/
│       │       ├── create-booking.dto.ts
│       │       └── update-booking.dto.ts
│       │
│       ├── services/
│       │   ├── services.module.ts      # Imports NotificationsModule
│       │   ├── services.controller.ts  # /services, /services/:id, /services/:id/rate
│       │   ├── services.service.ts     # create (notifies staff), update (status lifecycle), rate
│       │   └── dto/
│       │       ├── create-service-request.dto.ts
│       │       ├── update-service-request.dto.ts
│       │       └── rate-service-request.dto.ts
│       │
│       ├── housekeeping/
│       │   ├── housekeeping.module.ts  # Imports NotificationsModule
│       │   ├── housekeeping.controller.ts  # /housekeeping, /housekeeping/:id
│       │   ├── housekeeping.service.ts     # create, update (INSPECTED → room AVAILABLE)
│       │   └── dto/
│       │       ├── create-housekeeping-task.dto.ts
│       │       └── update-housekeeping-task.dto.ts
│       │
│       ├── invoices/                   # Phase 4 — billing
│       │   ├── invoices.module.ts
│       │   ├── invoices.controller.ts  # /invoices, /invoices/:id, /invoices/booking/:bookingId, .../generate
│       │   └── invoices.service.ts     # generateForBooking (10% tax, line items, INV-YYYYMMDD-XXXX)
│       │
│       ├── payments/                   # Phase 4 — Stripe
│       │   ├── payments.module.ts
│       │   ├── payments.controller.ts  # /payments, /payments/intent, /payments/webhook (PUBLIC, raw body)
│       │   ├── payments.service.ts     # createPaymentIntent, handleWebhook (payment_intent.succeeded)
│       │   └── dto/
│       │       └── create-payment-intent.dto.ts
│       │
│       ├── crm/                        # Phase 5 — email automation + discount codes
│       │   ├── crm.module.ts
│       │   ├── crm.controller.ts       # /crm/emails, /crm/triggers, /crm/discount-codes
│       │   ├── crm.service.ts          # email log queries, discount CRUD, @Cron triggers
│       │   ├── email.service.ts        # SendGrid wrapper (STUB mode when no API key)
│       │   ├── email-templates.ts      # HTML email bodies
│       │   └── dto/
│       │       └── create-discount.dto.ts
│       │
│       ├── ota/                        # Phase 6 — OTA manual booking entry
│       │   ├── ota.module.ts
│       │   ├── ota.controller.ts       # /ota/bookings, /ota/revenue
│       │   ├── ota.service.ts          # create OTA booking (commission), revenue rollup
│       │   └── dto/
│       │       └── create-ota-booking.dto.ts
│       │
│       ├── analytics/                  # Phase 6 — reporting
│       │   ├── analytics.module.ts
│       │   ├── analytics.controller.ts # /analytics/overview, /revenue-by-day, /occupancy-by-day, /bookings-by-source, /top-rooms
│       │   └── analytics.service.ts    # aggregate queries
│       │
│       └── ratings/                    # Post-stay guest reviews
│           ├── ratings.module.ts
│           ├── ratings.controller.ts   # /ratings, /ratings/summary, /ratings/booking/:bookingId
│           ├── ratings.service.ts      # create rating, summary aggregates
│           └── dto/
│               └── create-rating.dto.ts
│
├── prisma/
│   ├── schema.prisma               # Full DB schema — 16 models, 16 enums
│   ├── migrations/                 # 20260427091801_init, 20260617000000_add_ratings_feature
│   └── seed.ts                     # Upsert-safe seed (3 categories, 7 rooms, 5 users, 1 sample booking + invoice)
│
├── package.json
├── tsconfig.json
└── .env
```

### Module registration order in `app.module.ts`
```
PrismaModule
AuthModule
UsersModule
NotificationsModule   ← must come before any module that imports it
RoomsModule
GuestsModule
BookingsModule
ServicesModule
HousekeepingModule
InvoicesModule
PaymentsModule
CrmModule
OtaModule
AnalyticsModule
RatingsModule
```

---

## Frontend (`apps/web/`)

```
apps/web/src/
├── main.tsx
├── App.tsx                         # All routes defined here
│
├── pages/
│   ├── ComingSoonPage.tsx          # Placeholder for unbuilt phases
│   │
│   ├── auth/
│   │   └── LoginPage.tsx           # Staff + admin login
│   │
│   ├── admin/
│   │   ├── DashboardPage.tsx       # Live stats (rooms, check-ins, recent bookings)
│   │   ├── StaffPage.tsx           # Staff management — add/activate/delete users
│   │   ├── RoomsPage.tsx           # Room grid with create/edit/delete modal
│   │   ├── BookingsPage.tsx        # Booking table with status + search filter
│   │   ├── GuestsPage.tsx          # Guest table with search
│   │   ├── AnalyticsPage.tsx       # Phase 6 — revenue/occupancy/source charts
│   │   ├── CrmPage.tsx             # Phase 5 — email logs + discount codes
│   │   ├── PaymentsPage.tsx        # Phase 4 — payment history + revenue stats
│   │   └── RatingsPage.tsx         # Guest review list + summary
│   │
│   ├── staff/
│   │   ├── DashboardPage.tsx       # Live stats + today's check-ins
│   │   ├── RoomDashboardPage.tsx   # Color-coded room grid, inline status change, real-time WS
│   │   ├── BookingsPage.tsx        # Booking list + 4-step create wizard
│   │   ├── CheckInPage.tsx         # Lookup by booking# or name → check-in / check-out / cancel
│   │   ├── ServiceQueuePage.tsx    # Ticket list + detail panel, assign + status actions
│   │   ├── HousekeepingPage.tsx    # Task cards, status progression, create modal
│   │   ├── OtaBookingsPage.tsx     # Phase 6 — OTA manual booking entry + revenue
│   │   └── GuestsPage.tsx          # Guest list with inline edit + booking history
│   │
│   └── guest/
│       ├── GuestPortalPage.tsx     # Login via booking number + last name
│       ├── GuestHomePage.tsx       # Quick-action hub
│       ├── ServiceRequestPage.tsx  # Submit + track service requests (also used for /complaints)
│       └── BillPage.tsx            # Phase 4 — invoice view + inline Stripe Elements payment
│
├── components/
│   ├── layouts/
│   │   ├── AdminLayout.tsx         # Sidebar + notification header
│   │   ├── StaffLayout.tsx         # Sidebar + notification header
│   │   ├── GuestLayout.tsx         # Tab navigation
│   │   ├── AuthBackground.tsx      # Animated backdrop for the login screen
│   │   └── Sidebar.tsx
│   ├── routing/
│   │   └── ProtectedRoute.tsx      # Role-based route guard
│   └── notifications/
│       └── NotificationDropdown.tsx
│
├── contexts/
│   ├── AuthContext.tsx             # login, guestLogin, logout, user state
│   │                               # Boot: guests restore from localStorage.guestUser (not /auth/me)
│   ├── SocketContext.tsx           # Socket.IO connection (skipped for guests)
│   └── NotificationContext.tsx    # Fetch + real-time notifications (skipped for guests)
│
└── lib/
    ├── api.ts                      # Axios instance — auto-attaches JWT, silent refresh, toast errors
    └── socket.ts                   # Socket.IO client factory
```

---

## Shared Package (`packages/shared/`)

```
packages/shared/src/
├── index.ts                        # Re-exports everything
├── constants/
│   ├── roles.ts                    # UserRole, UserStatus enums
│   └── statuses.ts                 # RoomStatus, RoomType, BookingStatus, BookingSource,
│                                   # ServiceType, ServiceStatus, HousekeepingStatus,
│                                   # InvoiceStatus, PaymentMethod, PaymentStatus,
│                                   # NotificationType, EmailType
└── types/
    ├── user.types.ts               # IUser, IStaff, IGuest
    ├── room.types.ts               # IRoom, IRoomCategory
    ├── booking.types.ts            # IBooking
    ├── payment.types.ts            # IPayment
    └── notification.types.ts       # INotification + WS payload interfaces
```

---

## Guest Landing (`apps/guest/`)

`C'est La Stay` — the public, single-page marketing/landing site (separate from the `web` portal). Vite + React + Tailwind with a lazy-loaded WebGL layer (three.js) and GSAP smooth-scroll. Deploys to Vercel; prod domain `cestlastay.com`.

```
apps/guest/src/
├── main.tsx
├── App.tsx                         # Section composition + cream veil + Matrimandir
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx              # Login link → ${VITE_PORTAL_URL}/guest-portal
│   │   └── Footer.tsx
│   ├── sections/                   # Hero, Rooms, Packages, Amenities, Stats,
│   │   └── ...                     #   Matrimandir, Reserve, FooterCta
│   ├── scenes/                     # WebGL/canvas — lazy-loaded so three.js stays
│   │   └── ...                     #   out of the initial chunk (SceneBackground,
│   │                               #   HeroScene, MatrimandirSphere, ClothAmenities)
│   └── ui/                         # Button, Card, Carousel, Reveal, Marquee, …
│
├── hooks/                          # useSmoothScroll, useReveal, useParallax
├── lib/
│   ├── content.ts                  # No-code editing surface for all page copy
│   ├── api.ts / booking.ts         # Public booking flow (gated by VITE_ENABLE_BOOKING_API)
│   ├── gsap.ts / events.ts / portal.ts
│   └── cloth/clothScene.ts
├── types/booking.types.ts
└── styles/globals.css
```

> The booking form calls public API endpoints (`GET /rooms/categories`, `GET /rooms/availability`, `POST /bookings/public`) only when `VITE_ENABLE_BOOKING_API=true`.

---

## Key Design Decisions

- **Single Socket.IO gateway** — `NotificationsGateway` is the only `@WebSocketGateway`. `RoomsGateway` and `BookingsGateway` are plain `@Injectable()` wrappers that delegate to it. This avoids namespace conflicts.
- **No pagination** — all list endpoints return plain arrays. Pagination can be added in a future phase.
- **Assignment uses `staff.id`** — `assignedToId` on both `service_requests` and `housekeeping_tasks` references the `staff` table primary key, not the `user` table. Always use `staff.id` from `GET /users/staff-list`.
- **Guest session persistence** — guest user object is stored in `localStorage.guestUser` at login time so page refreshes work without hitting `/auth/me`. Includes `bookingId` so Phase 4 BillPage can resolve the active invoice.
- **Stripe raw body** — webhook signature verification needs an unparsed body, so `NestFactory.create(AppModule, { rawBody: true })` is set in `main.ts`. The webhook route is also marked `@Public()` so the global `JwtAuthGuard` doesn't reject Stripe.
