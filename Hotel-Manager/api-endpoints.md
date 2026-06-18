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
| GET | `/rooms/categories` | Any | List all room categories |
| POST | `/rooms/categories` | ADMIN | Create room category |
| PATCH | `/rooms/categories/:id` | ADMIN | Update room category |
| DELETE | `/rooms/categories/:id` | ADMIN | Delete category (fails if rooms exist) |
| GET | `/rooms/availability` | Any | Available rooms for date range — `?checkIn=&checkOut=&categoryId=` |
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
| GET | `/bookings` | ADMIN, STAFF | List bookings — `?status=&guestId=&roomId=&search=` |
| GET | `/bookings/:id` | ADMIN, STAFF | Get booking with guest, room, createdBy |
| POST | `/bookings` | ADMIN, STAFF | Create booking — validates no overlap, marks room RESERVED |
| PATCH | `/bookings/:id` | ADMIN, STAFF | Update dates / numberOfGuests / status |
| POST | `/bookings/:id/check-in` | ADMIN, STAFF | Set CHECKED_IN, room → OCCUPIED, notifies all staff |
| POST | `/bookings/:id/check-out` | ADMIN, STAFF | Set CHECKED_OUT, room → CLEANING, auto-creates housekeeping task, notifies staff |
| POST | `/bookings/:id/cancel` | ADMIN, STAFF | Cancel booking, frees room if RESERVED |

**Booking number format:** `BKG-YYYYMMDD-XXXX` (sequential per day)

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
| GET | `/services` | ADMIN, STAFF | List requests — `?status=&type=&guestId=` |
| GET | `/services/:id` | ADMIN, STAFF | Get single request |
| POST | `/services` | Any authenticated | Create request — notifies all staff in real-time |
| PATCH | `/services/:id` | ADMIN, STAFF | Update status, notes, assignedToId, priority |

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
  "notes": "En route"
}
```

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

## Invoices

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/invoices` | ADMIN | List all invoices |
| GET | `/invoices/:id` | ADMIN, STAFF | Get a single invoice with line items + booking |
| GET | `/invoices/booking/:bookingId` | Any authenticated (incl. GUEST) | Get invoice for a booking — used by guest BillPage |
| POST | `/invoices/booking/:bookingId/generate` | ADMIN, STAFF | Auto-generate (or return existing) invoice for a booking |

**Invoice number format:** `INV-YYYYMMDD-XXXX`

**Auto-generation logic:**
- Subtotal = `roomRate × nights` + service request `actualCost` line items
- Tax = `subtotal × 0.10` (10%)
- Total = `subtotal + tax - discount`
- One invoice per booking (`bookingId` is UNIQUE on `invoices`)

**Status lifecycle:** `DRAFT → PENDING → PARTIALLY_PAID → PAID` (or `OVERDUE`, `CANCELLED`)

---

## Payments

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/payments` | ADMIN | List all payments with invoice + guest |
| GET | `/payments/invoice/:invoiceId` | Any authenticated (incl. GUEST) | List payments for an invoice |
| POST | `/payments/intent` | Any authenticated (incl. GUEST) | Create Stripe `PaymentIntent` → returns `clientSecret` |
| POST | `/payments/webhook` | [PUBLIC] | Stripe webhook — signature-verified, raw body required |

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

## Upcoming Endpoints (Phase 6+)

| Phase | Endpoint | Description |
|-------|----------|-------------|
| 6 | `GET/POST /ota/bookings` | OTA manual entry |
| 6 | `GET /analytics/*` | Occupancy, revenue, OTA reports |

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
