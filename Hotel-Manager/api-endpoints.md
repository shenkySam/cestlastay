# API Endpoints

**Base URL:** `http://localhost:3000/api/v1`
**Auth:** All endpoints require `Authorization: Bearer <token>` unless marked `[PUBLIC]`.
**Permissions:** `ADMIN` > `STAFF` > `GUEST`. Higher roles always have access to lower-role endpoints.

Responses are plain JSON objects or arrays — **no pagination wrappers, no envelope objects**.

---

## Authentication

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/auth/register` | [PUBLIC] | Create user account |
| POST | `/auth/login` | [PUBLIC] | Login → returns `accessToken` + `refreshToken` |
| POST | `/auth/guest-portal` | [PUBLIC] | Guest access via booking number + lastName → 24h token, no refresh |
| POST | `/auth/refresh` | [PUBLIC] | Exchange refresh token for new access token |
| GET | `/auth/me` | Any staff/admin | Returns current user profile. **Does NOT work for guest tokens** |
| POST | `/auth/logout` | Any | Stateless logout |

### Guest portal token
- `sub` in JWT = `guestId` (Guest table), not a userId
- Only valid for guest-facing endpoints. `/auth/me` will 401 with this token.

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
| GET | `/rooms/availability` | [PUBLIC] | Available rooms for date range — `?checkIn=&checkOut=&categoryId=` (used by the guest landing) |
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
| POST | `/bookings/public` | [PUBLIC] | Self-service booking from the guest landing — find-or-create guest by email, creates booking (`CONFIRMED` if a room is free for the dates, else `PENDING`), `source=DIRECT`, owned by the `system` user |
| GET | `/bookings` | ADMIN, STAFF | List bookings — `?status=&guestId=&roomId=&search=` |
| GET | `/bookings/:id` | ADMIN, STAFF | Get booking with guest, room, createdBy |
| POST | `/bookings` | ADMIN, STAFF | Create booking — validates no overlap, marks room RESERVED |
| PATCH | `/bookings/:id` | ADMIN, STAFF | Update dates / numberOfGuests / status |
| POST | `/bookings/:id/check-in` | ADMIN, STAFF | Set CHECKED_IN, room → OCCUPIED, notifies all staff |
| POST | `/bookings/:id/check-out` | ADMIN, STAFF | Set CHECKED_OUT, room → CLEANING, auto-creates housekeeping task, notifies staff |
| POST | `/bookings/:id/cancel` | ADMIN, STAFF | Cancel booking, frees room if RESERVED |

**Booking number format:** `BKG-YYYYMMDD-XXXX` (sequential per day)

**`POST /bookings/public` body** (mirrors `apps/guest` `CreatePublicBookingRequest`):
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "+1...",            // optional
  "checkInDate": "2026-07-01",
  "checkOutDate": "2026-07-04",
  "numberOfGuests": 2,
  "categoryId": "category-uuid", // optional — picks an available room in the category
  "specialRequests": "Sea view"  // optional
}
```
> The guest landing only calls this when `VITE_ENABLE_BOOKING_API=true`. The endpoint is `@Public()` — no auth required.

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
| GET | `/services` | ADMIN, STAFF, GUEST | List requests — `?status=&type=&guestId=`. **Guests see only their own** (`guestId` is forced to the token's guest, any client-sent `guestId` is ignored) |
| GET | `/services/:id` | ADMIN, STAFF | Get single request |
| POST | `/services` | Any authenticated | Create request — notifies all staff in real-time. **For guests, `guestId`/`bookingId` are forced to the token's** (client-sent values ignored) |
| PATCH | `/services/:id` | ADMIN, STAFF | Update status, notes, assignedToId, priority, `estimatedCost` / `actualCost` (pricing — makes a COMPLETED ticket billable on the folio) |

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
| POST | `/invoices/booking/:bookingId` | ADMIN, STAFF | Create the **DRAFT** folio. Body `{ "includeRoomCharge": bool }` (optional) — defaults to **false for OTA-source bookings** (room already paid via OTA), **true for DIRECT/WALK_IN**. 409 if a folio already exists |
| PATCH | `/invoices/:id` | ADMIN, STAFF | Update `discountAmount` / `dueDate` → recalc |
| POST | `/invoices/:id/issue` | ADMIN, STAFF | `DRAFT → PENDING` — reveals the invoice to the guest. 400 if not DRAFT |
| POST | `/invoices/:id/items` | ADMIN, STAFF | Add line item → recalc. Either `{ "serviceRequestId" }` (description + cost pulled from the ticket) **or** `{ "description", "unitPrice", "quantity"? }` (manual line, quantity defaults 1) |
| PATCH | `/invoices/:id/items/:itemId` | ADMIN, STAFF | Edit `description` / `quantity` / `unitPrice` → recalc |
| DELETE | `/invoices/:id/items/:itemId` | ADMIN, STAFF | Remove line item → recalc |

**Invoice number format:** `INV-YYYYMMDD-XXXX`

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
| POST | `/ota/bookings` | ADMIN, STAFF | Manually record an OTA booking (Booking.com / Airbnb / Expedia / Agoda / Other). Computes commission (explicit or default rate per source); marks room RESERVED |
| GET | `/ota/bookings` | ADMIN, STAFF | List OTA bookings — `?source=&from=&to=` |
| GET | `/ota/revenue` | ADMIN, STAFF | Revenue report — gross / commission / net, totals + breakdown by source — `?from=&to=` |

**Default commission rates** (when not supplied): Booking.com 15%, Airbnb 14%, Expedia 18%, Agoda 17%, Other 15%.

---

## Analytics

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/analytics/overview` | ADMIN | Headline stats (occupancy, revenue, counts) |
| GET | `/analytics/revenue-by-day` | ADMIN | Daily revenue series |
| GET | `/analytics/occupancy-by-day` | ADMIN | Daily occupancy series |
| GET | `/analytics/bookings-by-source` | ADMIN | Booking counts grouped by source |
| GET | `/analytics/top-rooms` | ADMIN | Most-booked rooms |

---

## Error Responses

| Status | When |
|--------|------|
| 400 | Validation failure, bad dates, check-out before check-in |
| 401 | Missing/invalid/expired JWT |
| 403 | Valid JWT but insufficient role |
| 404 | Resource not found (silenced in frontend toast) |
| 409 | Double booking conflict |
| 500 | Unexpected server error |

```json
{ "statusCode": 403, "message": "Forbidden resource" }
{ "statusCode": 409, "message": "Room is already booked for the selected dates (BKG-20260501-0001)" }
```
