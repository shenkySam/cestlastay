# API Endpoints

**Base URL:** `http://localhost:3000/api/v1`
**Auth:** All endpoints require `Authorization: Bearer <token>` unless marked `[PUBLIC]`.
**Permissions:** `ADMIN` > `STAFF` > `GUEST`. Higher roles always have access to lower-role endpoints.

Responses are plain JSON objects or arrays — **no pagination wrappers, no envelope objects**.

---

## Authentication

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/auth/google` | [PUBLIC] | Staff sign-in. Body `{ idToken }` (Google Identity Services credential) → returns `user` + `accessToken` + `refreshToken` |
| POST | `/auth/apple` | [PUBLIC] | Staff sign-in. Body `{ idToken }` (Sign in with Apple JS `authorization.id_token`) → same response as `/auth/google` |
| POST | `/auth/guest-portal` | [PUBLIC] | Guest sign-in with booking number + lastName (case-insensitive) → `{ accessToken, booking }`, 24h token, no refresh. Only for an [active stay](#guest-sign-in); otherwise 404 `No current or upcoming stay found for that booking number and last name` |
| POST | `/auth/guest/google` | [PUBLIC] | Guest sign-in with Google. Body `{ idToken }` → same response as `/auth/guest-portal`. Matches the verified Google email to the guest email on an active-stay booking; 404 `We couldn't find a current or upcoming stay booked under {email}. Try your booking number and last name.`; 401 for an invalid token or unverified email |
| GET | `/auth/guest/me` | GUEST | `{ booking }` for the token's booking (same shape as at sign-in) — the web app refreshes the stored booking with it on load, e.g. after check-in |
| POST | `/auth/refresh` | [PUBLIC] | Exchange refresh token for new access token |
| GET | `/auth/me` | Any staff/admin | Returns current user profile. Not for guest tokens (returns an empty body) — use `/auth/guest/me` |
| POST | `/auth/logout` | Any | Stateless logout |

**Rate limits** (per client IP, `429` when exceeded; only these routes are throttled): `/auth/guest-portal` 5/min and 20/hour · `/auth/google`, `/auth/apple`, `/auth/guest/google` 10/min · `/auth/refresh` 30/min. Counters are in memory (one API instance). The API trusts one proxy hop (`trust proxy`) so the IP is the visitor's, not Railway's proxy.

### Sign-in (Google / Apple only)
- There is **no email + password login** and **no self-signup**. An admin creates the user (`POST /users`, by email); the person then signs in with the Google or Apple account for that email.
- The API verifies the ID token's signature (provider JWKS), issuer, audience (`GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID`) and expiry.
- First sign-in per provider: matched to a user by **verified** email (case-insensitive), then the provider's `sub` is stored in `users.google_id` / `users.apple_id`. Later sign-ins match on that ID.
- `401` when: no user has that email, the email is unverified or an Apple "Hide My Email" relay address, the email's user is already linked to a different Google/Apple account, the user isn't `ACTIVE`, or it's the `system@hotel.com` account. `503` when that provider's client ID isn't configured.

### Guest sign-in
- **Active stay** = booking `CHECKED_IN`, or `CONFIRMED` with `checkOutDate` today or later. `PENDING`, cancelled, checked-out and past bookings can't sign in. Guests can therefore sign in before arrival (e.g. from the booking-confirmation email).
- Google: guest emails aren't unique, so the API matches **bookings** whose guest email equals the verified Google email, and picks the most recent `CHECKED_IN` one, else the soonest upcoming `CONFIRMED` one.
- Before arrival (`CONFIRMED`) a guest can view the booking and bill, but `POST /services` returns 403 `Requests open once you've checked in` and `POST /ratings` returns 403.

### Guest token
- `sub` in JWT = `guestId` (Guest table), not a userId; `bookingId` = the booking it's scoped to
- Each request loads that booking and requires `booking.guestId === sub`; the principal carries `guest`, `bookingId` and `bookingStatus`
- Only valid for guest-facing endpoints

---

## Users

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/users` | ADMIN | Create staff/admin account (calls same logic as register) |
| GET | `/users` | ADMIN | List all users, optional `?role=ADMIN\|STAFF\|GUEST` |
| GET | `/users/staff-list` | ADMIN, STAFF | Read-only list of active STAFF users with `staff.id` — used for assignment dropdowns |
| GET | `/users/:id` | ADMIN, STAFF | Get user details |
| PATCH | `/users/:id` | Own profile or ADMIN | Update profile (firstName, lastName, phone, profileImageUrl) |
| PATCH | `/users/:id/status` | ADMIN | Activate / deactivate / suspend user |
| DELETE | `/users/:id` | ADMIN | Delete user |

**`GET /users/staff-list` response shape:**
```json
[
  {
    "id": "user-uuid",
    "firstName": "Maria",
    "lastName": "Santos",
    "staff": { "id": "staff-uuid", "department": "Housekeeping", "position": "Housekeeper" }
  }
]
```
> Use `staff.id` as the value for `assignedToId` in service/housekeeping PATCH calls.

---

## Rooms

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/rooms/categories` | [PUBLIC] | List all room categories (used by the guest landing) |
| POST | `/rooms/categories` | ADMIN | Create room category |
| PATCH | `/rooms/categories/:id` | ADMIN | Update room category |
| DELETE | `/rooms/categories/:id` | ADMIN | Delete category (fails if rooms exist) |
| GET | `/rooms/availability` | [PUBLIC] | Available rooms for date range — `?checkIn=&checkOut=&categoryId=` |
| GET | `/rooms` | Any | List rooms — `?status=&floor=&categoryId=` |
| GET | `/rooms/:id` | Any | Get single room with category |
| POST | `/rooms` | ADMIN | Create room |
| PATCH | `/rooms/:id` | ADMIN | Update room (categoryId, floor, maintenanceNotes) |
| PATCH | `/rooms/:id/status` | ADMIN, STAFF | Update room status — emits `room:status-changed` WS event |
| DELETE | `/rooms/:id` | ADMIN | Delete room |

**Room status flow:**
`AVAILABLE → RESERVED` (on booking) `→ OCCUPIED` (on check-in) `→ CLEANING` (on check-out) `→ AVAILABLE` (after housekeeping INSPECTED)

---

## Bookings

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/bookings/public` | [PUBLIC] | Self-service booking from the guest landing — finds/creates guest, picks an available room in the category, creates booking |
| GET | `/bookings` | ADMIN, STAFF | List bookings — `?status=&guestId=&roomId=&search=` |
| GET | `/bookings/:id` | ADMIN, STAFF | Get booking with guest, rooms (`rooms[].room`), createdBy |
| POST | `/bookings` | ADMIN, STAFF | Create booking — body takes `roomIds: string[]`; validates all rooms exist and are free, marks each room RESERVED |
| PATCH | `/bookings/:id` | ADMIN, STAFF | Update dates / numberOfGuests / status |
| POST | `/bookings/:id/check-in` | ADMIN, STAFF | Set CHECKED_IN, all rooms → OCCUPIED, notifies all staff |
| POST | `/bookings/:id/check-out` | ADMIN, STAFF | Set CHECKED_OUT, all rooms → CLEANING, auto-creates one housekeeping task per room, notifies staff |
| POST | `/bookings/:id/cancel` | ADMIN, STAFF | Cancel booking, frees its rooms that are RESERVED |

**Booking number format:** `BKG-YYYYMMDD-XXXX` (sequential per day)

**Concurrent creates:** numbers are allocated read-max-then-increment, so two simultaneous creates can collide on the unique column. The create is retried on that collision (`retryOnUniqueViolation` in `apps/api/src/common/prisma-retry.ts`, up to 8 attempts with a widening random offset, so a retry can leave a gap in the sequence). If every attempt collides, the API returns **409** `Could not allocate a unique booking number. Please try again.` The same applies to invoice numbers and OTA bookings.

**Multi-room bookings:** a booking holds one or more rooms via `booking_rooms` — responses expose `rooms: [{ roomId, roomRate, room: {...} }]` instead of a single `room`. All rooms share the booking's check-in/out dates; `totalAmount` = Σ(per-room rate × nights). `POST /bookings/public` remains single-room (one landing-form category) but returns the same `rooms[]` shape.

**`POST /bookings/public` body** (no auth — used by the C'est La Stay landing, attributed to the `system@hotel.com` user):
```json
{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "ada@example.com",
  "phone": "+1...",                 // optional
  "checkInDate": "2026-07-01",
  "checkOutDate": "2026-07-04",
  "numberOfGuests": 2,
  "categoryId": "category-uuid",    // optional — picks any available room if omitted
  "specialRequests": "Sea view"     // optional
}
```

---

## Guests

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/guests` | ADMIN, STAFF | List guests — `?search=` (name, email, phone) |
| GET | `/guests/:id` | ADMIN, STAFF | Get guest profile |
| GET | `/guests/:id/bookings` | ADMIN, STAFF | Booking history for guest |
| POST | `/guests` | ADMIN, STAFF | Create guest profile |
| PATCH | `/guests/:id` | ADMIN, STAFF | Update guest profile |

---

## Service Requests

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/services` | ADMIN, STAFF, GUEST | List requests — `?status=&type=&guestId=` (guests pass their own `guestId`) |
| GET | `/services/:id` | ADMIN, STAFF | Get single request |
| POST | `/services` | Any authenticated | Create request — notifies all staff in real-time. **For guests, `guestId`/`bookingId` are forced to the token's** (client-sent values ignored), and the booking must be `CHECKED_IN` (403 otherwise) |
| PATCH | `/services/:id` | ADMIN, STAFF | Update status, notes, assignedToId, priority, `estimatedCost` / `actualCost` (pricing — makes a COMPLETED ticket billable on the folio) |
| POST | `/services/:id/rate` | GUEST | Guest rates a completed service request (`serviceRating` 1-5 + optional comment) |

**`POST /services` body:**
```json
{
  "guestId": "guest-uuid",
  "bookingId": "booking-uuid",
  "type": "ROOM_SERVICE",
  "description": "Extra towels please",
  "priority": 1
}
```

**`PATCH /services/:id` body (update + assign in one call):**
```json
{
  "status": "IN_PROGRESS",
  "assignedToId": "staff-uuid",
  "notes": "En route",
  "actualCost": 25.00
}
```
> `estimatedCost` / `actualCost` make the request billable: once the ticket is `COMPLETED` and priced, it appears in `GET /invoices/booking/:bookingId/billable-services` and can be pulled onto the folio (billing uses `actualCost ?? estimatedCost`).

**Ticket number format:** `SRV-YYYYMMDD-XXXX`

**Side effects on create:** persists notification to DB + pushes `notification:new` to all active ADMIN/STAFF users via Socket.IO.

**Status lifecycle:** `PENDING → IN_PROGRESS` (startedAt set) `→ COMPLETED` (completedAt set) or `CANCELLED`

---

## Housekeeping

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/housekeeping` | ADMIN, STAFF | List tasks — `?status=&assignedToId=` |
| GET | `/housekeeping/:id` | ADMIN, STAFF | Get single task |
| POST | `/housekeeping` | ADMIN, STAFF | Create task manually — notifies all staff |
| PATCH | `/housekeeping/:id` | ADMIN, STAFF | Update status, assignedToId, notes |

**`PATCH /housekeeping/:id` — when `status = INSPECTED`:**
- Sets `inspectedAt = now`
- Automatically sets room status → `AVAILABLE` and `lastCleanedAt = now`

**Auto-created tasks:** on every `POST /bookings/:id/check-out`, a `checkout_cleaning` task is created for the room with `priority = 2`.

**Task types:** `checkout_cleaning` | `daily_cleaning` | `deep_cleaning`

**Status lifecycle:** `PENDING → IN_PROGRESS → COMPLETED → INSPECTED` (only INSPECTED triggers room status change)

---

## Notifications

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/notifications` | Any staff/admin | Get own notifications — `?status=UNREAD\|READ` |
| PATCH | `/notifications/read-all` | Any staff/admin | Mark all as read (must be defined before `:id/read`) |
| PATCH | `/notifications/:id/read` | Any staff/admin | Mark one notification as read |

> Guests cannot access `/notifications` — their JWT `sub` is a guestId, not a userId. `NotificationContext` skips these calls when `user.role === GUEST`.

**Response:** plain array of notification objects.

---

## Invoices (Folio)

An invoice is the booking's **folio**: staff/admin create it as a DRAFT, build it from line items (optional room charge, billed service requests, free-form extras), then **issue** it to the guest. One invoice per booking (`bookingId` is UNIQUE on `invoices`).

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/invoices` | ADMIN | List all invoices |
| GET | `/invoices/:id` | ADMIN, STAFF | Get a single invoice with line items + payments + booking |
| GET | `/invoices/booking/:bookingId` | Any authenticated (incl. GUEST) | Invoice for a booking — used by guest BillPage and the staff `<InvoiceEditor>`. **Guests get 404 while status is `DRAFT`** (folio hidden until issued) and can only access their own booking (403 otherwise) |
| GET | `/invoices/booking/:bookingId/billable-services` | ADMIN, STAFF | `COMPLETED` service requests with a cost set and not yet on any invoice — the "pull unbilled services" picker |
| POST | `/invoices/booking/:bookingId` | ADMIN, STAFF | Create the **DRAFT** folio. Body `{ "includeRoomCharge": bool }` (optional) — defaults to **false for OTA-source bookings** (room already paid via OTA), **true for DIRECT/WALK_IN**. When included, creates **one room-charge line per room** (`{category} (Room {number}) — N nights` at that room's rate). 409 if a folio already exists |
| PATCH | `/invoices/:id` | ADMIN, STAFF | Update `discountAmount` / `dueDate` → recalc |
| POST | `/invoices/:id/issue` | ADMIN, STAFF | `DRAFT → PENDING` — reveals the invoice to the guest. 400 if not DRAFT |
| POST | `/invoices/:id/items` | ADMIN, STAFF | Add line item → recalc. Either `{ "serviceRequestId" }` (description + cost pulled from the ticket) **or** `{ "description", "unitPrice", "quantity"? }` (manual line, quantity defaults 1) |
| PATCH | `/invoices/:id/items/:itemId` | ADMIN, STAFF | Edit `description` / `quantity` / `unitPrice` → recalc |
| DELETE | `/invoices/:id/items/:itemId` | ADMIN, STAFF | Remove line item → recalc |

**Invoice number format:** `INV-YYYYMMDD-XXXX` (retried on collision like booking numbers; two concurrent `POST /invoices/booking/:bookingId` calls for the same booking → the loser gets **409** `An invoice already exists for this booking`)

**Recalc — runs after every item / discount change:**
- `subtotal = Σ items.totalPrice` · `tax = subtotal × TAX_RATE/100` (env `TAX_RATE`, default 10) · `total = max(0, subtotal + tax − discount)` · `balanceDue = max(0, total − paidAmount)`
- Auto-status: `paidAmount > 0 && balanceDue ≤ 0` → `PAID` (sets `paidAt`) · `paidAmount > 0` → `PARTIALLY_PAID` (clears `paidAt`) · else `DRAFT`/`PENDING` unchanged
- Only `CANCELLED` invoices are locked — adding a charge to a `PAID` folio legitimately flips it back to `PARTIALLY_PAID`

**Billing a service request (`POST /invoices/:id/items` with `serviceRequestId`):**
- Price = `actualCost ?? estimatedCost` (400 if neither set — price the ticket first via `PATCH /services/:id`)
- Must belong to the same booking as the invoice and not already be on an invoice (400 otherwise)
- Line description is generated as `"<Type> — <ticket description>"`, quantity 1; editable afterwards like any line

> ⚠️ Guests are strictly read-only: `GET /invoices/booking/:bookingId` is their only invoice endpoint. All mutating routes are `@Roles(ADMIN, STAFF)`. The old `POST /invoices/booking/:bookingId/generate` route was replaced by the staff-only `POST /invoices/booking/:bookingId`.

**Status lifecycle:** `DRAFT → (issue) → PENDING → PARTIALLY_PAID → PAID` (or `OVERDUE`, `CANCELLED`)

---

## Payments

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/payments` | ADMIN | List all payments with invoice + guest |
| GET | `/payments/invoice/:invoiceId` | Any authenticated (incl. GUEST) | List payments for an invoice |
| POST | `/payments/manual` | ADMIN, STAFF | Record an offline payment (cash / card / bank) against an invoice — creates a `COMPLETED` payment and updates the invoice's paid/balance/status |
| POST | `/payments/intent` | Any authenticated (incl. GUEST) | Create Stripe `PaymentIntent` → returns `clientSecret` |
| POST | `/payments/webhook` | [PUBLIC] | Stripe webhook — signature-verified, raw body required |

**`POST /payments/manual` body:**
```json
{
  "invoiceId": "invoice-uuid",
  "amount": 50,
  "method": "CASH",        // CREDIT_CARD | DEBIT_CARD | CASH | BANK_TRANSFER | DIGITAL_WALLET
  "notes": "front desk"     // optional
}
```
**Rules:** 400 if the invoice is already fully paid, cancelled, or `amount > balanceDue`. Guest Stripe checkout (`/payments/intent` + webhook) is unchanged and coexists with manual payments.

**`POST /payments/intent` body:**
```json
{ "invoiceId": "invoice-uuid" }
```
**Returns:** `{ "clientSecret": "pi_xxx_secret_yyy" }`

**Webhook handling:** On `payment_intent.succeeded`:
1. Creates `Payment` row (`PAY-YYYYMMDD-XXXX`, `method=CREDIT_CARD`, `status=COMPLETED`)
2. Updates Invoice `paidAmount`, `balanceDue`, `status` (`PAID` if balance ≤ 0, else `PARTIALLY_PAID`)
3. Sets `paidAt` if fully paid

**Payment number format:** `PAY-YYYYMMDD-XXXX`

> ⚠️ Stripe webhook requires raw body. `apps/api/src/main.ts` is bootstrapped with `rawBody: true` so `RawBodyRequest<Request>` works in `PaymentsController.webhook`.

---

## CRM & Email Automation

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/crm/emails` | ADMIN | List email logs — `?type=&status=&search=` |
| GET | `/crm/emails/stats` | ADMIN | Counts by status + grouped counts by type |
| GET | `/crm/triggers` | ADMIN | Static description of automated event → email mappings |
| POST | `/crm/emails/trigger/booking-confirmation/:bookingId` | ADMIN | Manually re-send booking confirmation |
| POST | `/crm/emails/trigger/check-in-reminder/:bookingId` | ADMIN | Manually send check-in reminder |
| POST | `/crm/emails/trigger/loyalty-discount/:bookingId` | ADMIN | Manually send post-stay loyalty email + create code |
| GET | `/crm/discount-codes` | ADMIN | List loyalty / promo codes |
| POST | `/crm/discount-codes` | ADMIN | Create discount code (PERCENTAGE / FIXED) |
| PATCH | `/crm/discount-codes/:id/toggle` | ADMIN | Activate / deactivate code |
| DELETE | `/crm/discount-codes/:id` | ADMIN | Delete code |
| POST | `/crm/subscribe` | [PUBLIC] | Newsletter signup from the guest site footer. Body `{ "email", "source"? }` (`source` defaults to `guest-footer`). Email is trimmed + lowercased and upserted, so re-subscribing is a no-op. Returns `{ ok: true, id }` |
| GET | `/crm/subscribers` | ADMIN | Newsletter subscribers, newest first (max 500) |

**Automatic email triggers:**
- `POST /bookings` → fires `BOOKING_CONFIRMATION`
- Daily 09:00 cron → `CHECK_IN_REMINDER` for bookings with `checkInDate = tomorrow` and `status = CONFIRMED`
- Daily 11:00 cron → `LOYALTY_DISCOUNT` for bookings checked out yesterday (skips guests already emailed in last 2 days)

**SendGrid stub mode:** if `SENDGRID_API_KEY` is missing or invalid, emails are logged (`status=SENT`) but never sent — used for local dev.

**`POST /crm/discount-codes` body:**
```json
{
  "code": "SUMMER26",            // optional — auto-generated if omitted
  "description": "Summer 2026 promo",
  "discountType": "PERCENTAGE",  // or "FIXED"
  "discountValue": 15,
  "validUntil": "2026-09-01T00:00:00Z",
  "maxUses": 100,                // optional
  "minStays": 2                   // optional
}
```

**Loyalty discount code format:** `LOYAL-XXXXXXXX` (auto-generated). Promo codes default to `PROMO-XXXXXXXX` if no code is provided.

---

## OTA Management

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/ota/bookings` | ADMIN, STAFF | Record a booking from an OTA channel (Booking.com, Airbnb, Expedia, Agoda, …) with commission |
| GET | `/ota/bookings` | ADMIN, STAFF | List OTA bookings — `?source=&status=` |
| GET | `/ota/revenue` | ADMIN, STAFF | Revenue + commission rollup grouped by OTA source |

**`POST /ota/bookings` body:** `roomIds: string[]`, `checkInDate`, `checkOutDate`, `numberOfGuests`, `source` (must be an OTA source), `otaBookingId`, optional `otaCommission`, `totalAmount` (OTA-supplied total wins over the rack total; commission is computed on it), and either an existing `guestId` or inline `guestFirstName/guestLastName/guestEmail/guestPhone`.

---

## Analytics

All routes are **ADMIN-only** and accept an optional `?from=&to=` date range.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/overview` | Headline KPIs (revenue, occupancy, bookings, ADR, etc.) |
| GET | `/analytics/revenue-by-day` | Daily revenue series |
| GET | `/analytics/occupancy-by-day` | Daily occupancy series |
| GET | `/analytics/bookings-by-source` | Booking counts grouped by source |
| GET | `/analytics/top-rooms` | Highest-earning / most-booked rooms |

---

## Ratings

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/ratings` | GUEST | Submit a review for the guest's own booking (one per booking); 403 while the booking is still `CONFIRMED` (before arrival) |
| GET | `/ratings` | ADMIN | List all ratings with guest + booking |
| GET | `/ratings/summary` | ADMIN | Average overall/room rating + distribution |
| GET | `/ratings/booking/:bookingId` | Any authenticated | Get the rating for a booking (null if not yet rated) |

**`POST /ratings` body:**
```json
{
  "bookingId": "booking-uuid",
  "overallRating": 5,
  "roomRating": 4,
  "comment": "Lovely stay"   // optional
}
```

---

## Inbound Email (Resend webhook)

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/webhooks/resend` | [PUBLIC], Svix-signed | Forwards mail received at `stay@cestlastay.com` to the team inboxes |

Resend receives mail for the domain and POSTs an `email.received` event here. `InboundEmailService` then:
1. Verifies the Svix signature: HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${rawBody}` with `RESEND_WEBHOOK_SECRET`, and rejects timestamps more than 5 minutes old. A missing secret, missing headers or a bad signature → **401**. Needs the raw body (`rawBody: true` in `main.ts`, same as the Stripe webhook).
2. Ignores every other event type (`{ ignored: "<type>" }`).
3. Fetches the full message and its attachments from the Resend API and re-sends it from `RESEND_FORWARD_FROM` to every address in `RESEND_FORWARD_TO`. The subject is prefixed with `[stay@]`, a "Forwarded message" header is added, and Reply-To is set to the original sender, so replying in Gmail answers the guest directly.
4. Sends with `Idempotency-Key: inbound-forward-<email_id>`, so Resend's webhook retries don't produce duplicate forwards. If the send fails, the endpoint returns a non-2xx response and Resend retries later.

If `RESEND_API_KEY` or `RESEND_FORWARD_TO` is unset, the event is acknowledged with `{ forwarded: false }` and a warning is logged. Env setup: see `setup-guide.md` / `DEPLOYMENT.md`.

---

## Error Responses

| Status | When |
|--------|------|
| 400 | Validation failure, bad dates, check-out before check-in |
| 401 | Missing/invalid/expired JWT; bad webhook signature |
| 403 | Valid JWT but insufficient role; a guest service request or rating before check-in |
| 404 | Resource not found (silenced in frontend toast); guest sign-in with no current or upcoming stay |
| 429 | Too many sign-in attempts from one IP (see [rate limits](#authentication)) |
| 409 | Double booking conflict; folio already exists for the booking; unique number allocation exhausted after retries |
| 500 | Unexpected server error |

```json
{ "statusCode": 403, "message": "Forbidden resource" }
{ "statusCode": 409, "message": "Room #201 already booked for the selected dates" }
```
