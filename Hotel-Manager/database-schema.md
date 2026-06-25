# Database Schema

Complete PostgreSQL database schema for the Hotel Management System, managed via Prisma ORM.

---

## Entity Relationship Overview

```
users (1) ──┬─── (0..1) staff
            └─── (0..1) guest (1) ─── (0..*) bookings

rooms (1) ─── (0..*) bookings (1) ─── (0..1) invoice (1) ─── (0..*) payments
                                  └─── (0..*) service_requests

rooms (1) ─── (0..*) housekeeping_tasks
staff (1) ─── (0..*) housekeeping_tasks
staff (1) ─── (0..*) service_requests (assigned)

invoice (1) ─── (0..*) invoice_items
service_request (0..1) ─── (0..*) invoice_items

bookings (1) ─── (0..1) rating (0..*) ─── (1) guests
```

---

## Core Tables

### 1. User Management

#### `users`
Universal user table for all roles (Admin, Staff, Guest).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique user identifier |
| `email` | VARCHAR | UNIQUE, NOT NULL | Login email |
| `password_hash` | VARCHAR | NOT NULL | Bcrypt hashed password |
| `first_name` | VARCHAR | NOT NULL | First name |
| `last_name` | VARCHAR | NOT NULL | Last name |
| `phone` | VARCHAR | NULL | Contact number |
| `role` | ENUM | NOT NULL | ADMIN, STAFF, GUEST |
| `status` | ENUM | DEFAULT 'ACTIVE' | ACTIVE, INACTIVE, SUSPENDED |
| `profile_image_url` | VARCHAR | NULL | Profile picture URL |
| `email_verified` | BOOLEAN | DEFAULT false | Email verification status |
| `last_login_at` | TIMESTAMP | NULL | Last login timestamp |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMP | AUTO | Auto-updated timestamp |

**Indexes:**
- `idx_users_email` on `email`
- `idx_users_role_status` on `(role, status)`

---

#### `staff`
Extended profile for staff users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Staff profile ID |
| `user_id` | UUID | FK (users), UNIQUE | References user account |
| `employee_id` | VARCHAR | UNIQUE, NOT NULL | Employee ID (e.g., EMP001) |
| `department` | VARCHAR | NOT NULL | Department (Front Desk, Housekeeping) |
| `position` | VARCHAR | NOT NULL | Position/Title |
| `hire_date` | DATE | NOT NULL | Date hired |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMP | AUTO | Auto-updated timestamp |

**Indexes:**
- `idx_staff_employee_id` on `employee_id`

---

#### `guests`
Guest profiles (can exist without user account for walk-ins).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Guest profile ID |
| `user_id` | UUID | FK (users), UNIQUE, NULL | References user account (optional) |
| `first_name` | VARCHAR | NOT NULL | First name |
| `last_name` | VARCHAR | NOT NULL | Last name |
| `email` | VARCHAR | NOT NULL | Contact email |
| `phone` | VARCHAR | NOT NULL | Contact phone |
| `address` | VARCHAR | NULL | Street address |
| `city` | VARCHAR | NULL | City |
| `country` | VARCHAR | NULL | Country |
| `zip_code` | VARCHAR | NULL | Postal code |
| `id_type` | VARCHAR | NULL | ID type (Passport, Driver's License) |
| `id_number` | VARCHAR | NULL | ID document number |
| `loyalty_points` | INTEGER | DEFAULT 0 | Accumulated loyalty points |
| `loyalty_tier` | VARCHAR | NULL | Loyalty tier (Bronze, Silver, Gold) |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMP | AUTO | Auto-updated timestamp |

**Indexes:**
- `idx_guests_email` on `email`
- `idx_guests_phone` on `phone`

---

### 2. Property Management

#### `room_categories`
Room types and pricing.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Category ID |
| `name` | VARCHAR | UNIQUE, NOT NULL | Category name (Deluxe Suite) |
| `type` | ENUM | NOT NULL | SINGLE, DOUBLE, SUITE, DELUXE, PRESIDENTIAL |
| `description` | TEXT | NULL | Category description |
| `base_price` | DECIMAL(10,2) | NOT NULL | Base nightly rate |
| `max_occupancy` | INTEGER | NOT NULL | Maximum guests allowed |
| `amenities` | TEXT[] | DEFAULT [] | Array of amenities (WiFi, TV, Minibar) |
| `images` | TEXT[] | DEFAULT [] | Array of image URLs |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMP | AUTO | Auto-updated timestamp |

---

#### `rooms`
Individual room inventory.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Room ID |
| `room_number` | VARCHAR | UNIQUE, NOT NULL | Room number (101, 205) |
| `category_id` | UUID | FK (room_categories) | Room category |
| `floor` | INTEGER | NOT NULL | Floor number |
| `status` | ENUM | DEFAULT 'AVAILABLE' | AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE, CLEANING, OUT_OF_ORDER |
| `last_cleaned_at` | TIMESTAMP | NULL | Last cleaning timestamp |
| `maintenance_notes` | TEXT | NULL | Current maintenance notes |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMP | AUTO | Auto-updated timestamp |

**Indexes:**
- `idx_rooms_number` on `room_number`
- `idx_rooms_status` on `status`
- `idx_rooms_category` on `category_id`

---

### 3. Booking System

#### `bookings`
Central booking records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Booking ID |
| `booking_number` | VARCHAR | UNIQUE, NOT NULL | Booking number (BKG-20260426-0001) |
| `guest_id` | UUID | FK (guests), NOT NULL | Guest profile |
| `room_id` | UUID | FK (rooms), NOT NULL | Assigned room |
| `check_in_date` | DATE | NOT NULL | Scheduled check-in date |
| `check_out_date` | DATE | NOT NULL | Scheduled check-out date |
| `number_of_guests` | INTEGER | NOT NULL | Number of guests |
| `status` | ENUM | DEFAULT 'PENDING' | PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, NO_SHOW |
| `source` | ENUM | DEFAULT 'DIRECT' | DIRECT, WALK_IN, BOOKING_COM, AIRBNB, EXPEDIA, AGODA, OTHER_OTA |
| `room_rate` | DECIMAL(10,2) | NOT NULL | Nightly room rate |
| `total_amount` | DECIMAL(10,2) | NOT NULL | Total booking amount |
| `discount_code` | VARCHAR | NULL | Applied discount code |
| `discount_amount` | DECIMAL(10,2) | NULL | Discount amount applied |
| `special_requests` | TEXT | NULL | Guest special requests |
| `actual_check_in_at` | TIMESTAMP | NULL | Actual check-in time |
| `actual_check_out_at` | TIMESTAMP | NULL | Actual check-out time |
| `ota_booking_id` | VARCHAR | NULL | External OTA booking reference |
| `ota_commission` | DECIMAL(10,2) | NULL | OTA commission amount |
| `created_by_id` | UUID | FK (users), NOT NULL | Staff who created booking |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMP | AUTO | Auto-updated timestamp |

**Indexes:**
- `idx_bookings_number` on `booking_number`
- `idx_bookings_guest` on `guest_id`
- `idx_bookings_room` on `room_id`
- `idx_bookings_status` on `status`
- `idx_bookings_dates` on `(check_in_date, check_out_date)`
- `idx_bookings_source` on `source`

---

### 4. Operations

#### `service_requests`
Guest service ticketing system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Service request ID |
| `ticket_number` | VARCHAR | UNIQUE, NOT NULL | Ticket number (SRV-20260426-0001) |
| `guest_id` | UUID | FK (guests), NOT NULL | Requesting guest |
| `booking_id` | UUID | FK (bookings), NULL | Related booking |
| `type` | ENUM | NOT NULL | ROOM_SERVICE, LAUNDRY, SPA, RESTAURANT, MAINTENANCE, CONCIERGE, OTHER |
| `status` | ENUM | DEFAULT 'PENDING' | PENDING, IN_PROGRESS, COMPLETED, CANCELLED |
| `priority` | INTEGER | DEFAULT 1 | Priority (1-5, 5 = highest) |
| `description` | TEXT | NOT NULL | Request description |
| `notes` | TEXT | NULL | Staff notes |
| `assigned_to_id` | UUID | FK (staff), NULL | Assigned staff member |
| `estimated_cost` | DECIMAL(10,2) | NULL | Estimated service cost |
| `actual_cost` | DECIMAL(10,2) | NULL | Final cost charged |
| `requested_at` | TIMESTAMP | DEFAULT now() | Request timestamp |
| `started_at` | TIMESTAMP | NULL | Started timestamp |
| `completed_at` | TIMESTAMP | NULL | Completed timestamp |
| `service_rating` | INTEGER | NULL | Guest rating of the service (1-5) |
| `rating_comment` | TEXT | NULL | Guest comment on the service |
| `rated_at` | TIMESTAMP | NULL | When the service was rated |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMP | AUTO | Auto-updated timestamp |

**Indexes:**
- `idx_services_ticket` on `ticket_number`
- `idx_services_guest` on `guest_id`
- `idx_services_status` on `status`
- `idx_services_type` on `type`

---

#### `housekeeping_tasks`
Housekeeping schedule and task tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Task ID |
| `room_id` | UUID | FK (rooms), NOT NULL | Room to clean |
| `assigned_to_id` | UUID | FK (staff), NULL | Assigned housekeeper |
| `task_type` | VARCHAR | NOT NULL | checkout_cleaning, daily_cleaning, deep_cleaning |
| `status` | ENUM | DEFAULT 'PENDING' | PENDING, IN_PROGRESS, COMPLETED, INSPECTED |
| `priority` | INTEGER | DEFAULT 1 | Priority (1-5) |
| `notes` | TEXT | NULL | Task notes |
| `scheduled_for` | TIMESTAMP | NOT NULL | Scheduled time |
| `started_at` | TIMESTAMP | NULL | Started timestamp |
| `completed_at` | TIMESTAMP | NULL | Completed timestamp |
| `inspected_at` | TIMESTAMP | NULL | Inspected timestamp |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMP | AUTO | Auto-updated timestamp |

**Indexes:**
- `idx_housekeeping_room` on `room_id`
- `idx_housekeeping_assigned` on `assigned_to_id`
- `idx_housekeeping_status` on `status`
- `idx_housekeeping_scheduled` on `scheduled_for`

---

### 5. Billing & Payments

#### `invoices`
Booking invoices.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Invoice ID |
| `invoice_number` | VARCHAR | UNIQUE, NOT NULL | Invoice number (INV-20260426-0001) |
| `booking_id` | UUID | FK (bookings), UNIQUE | Related booking |
| `status` | ENUM | DEFAULT 'DRAFT' | DRAFT, PENDING, PAID, PARTIALLY_PAID, OVERDUE, CANCELLED |
| `subtotal` | DECIMAL(10,2) | NOT NULL | Subtotal before tax |
| `tax_amount` | DECIMAL(10,2) | NOT NULL | Tax amount |
| `discount_amount` | DECIMAL(10,2) | DEFAULT 0 | Discount applied |
| `total_amount` | DECIMAL(10,2) | NOT NULL | Final total amount |
| `paid_amount` | DECIMAL(10,2) | DEFAULT 0 | Amount paid so far |
| `balance_due` | DECIMAL(10,2) | NOT NULL | Remaining balance |
| `issued_at` | TIMESTAMP | DEFAULT now() | Issue date |
| `due_date` | TIMESTAMP | NOT NULL | Payment due date |
| `paid_at` | TIMESTAMP | NULL | Payment completion date |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMP | AUTO | Auto-updated timestamp |

**Indexes:**
- `idx_invoices_number` on `invoice_number`
- `idx_invoices_booking` on `booking_id`
- `idx_invoices_status` on `status`

---

#### `invoice_items`
Invoice line items.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Item ID |
| `invoice_id` | UUID | FK (invoices), NOT NULL | Parent invoice |
| `service_request_id` | UUID | FK (service_requests), NULL | Related service (if applicable) |
| `description` | VARCHAR | NOT NULL | Item description (Room charge, Laundry) |
| `quantity` | INTEGER | DEFAULT 1 | Quantity |
| `unit_price` | DECIMAL(10,2) | NOT NULL | Price per unit |
| `total_price` | DECIMAL(10,2) | NOT NULL | Total (quantity × unit_price) |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_invoice_items_invoice` on `invoice_id`

---

#### `payments`
Payment transaction records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Payment ID |
| `payment_number` | VARCHAR | UNIQUE, NOT NULL | Payment number (PAY-20260426-0001) |
| `invoice_id` | UUID | FK (invoices), NOT NULL | Related invoice |
| `amount` | DECIMAL(10,2) | NOT NULL | Payment amount |
| `method` | ENUM | NOT NULL | CREDIT_CARD, DEBIT_CARD, CASH, BANK_TRANSFER, DIGITAL_WALLET |
| `status` | ENUM | DEFAULT 'PENDING' | PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED, PARTIALLY_REFUNDED |
| `stripe_payment_id` | VARCHAR | UNIQUE, NULL | Stripe PaymentIntent ID |
| `stripe_charge_id` | VARCHAR | NULL | Stripe Charge ID |
| `transaction_id` | VARCHAR | NULL | Transaction reference |
| `receipt_url` | VARCHAR | NULL | Receipt URL |
| `notes` | TEXT | NULL | Payment notes |
| `processed_at` | TIMESTAMP | NULL | Processing timestamp |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMP | AUTO | Auto-updated timestamp |

**Indexes:**
- `idx_payments_number` on `payment_number`
- `idx_payments_invoice` on `invoice_id`
- `idx_payments_status` on `status`
- `idx_payments_stripe` on `stripe_payment_id`

---

### 6. CRM & Communications

#### `notifications`
In-app notification center.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Notification ID |
| `user_id` | UUID | FK (users), NOT NULL | Recipient user |
| `type` | ENUM | NOT NULL | CHECK_IN, CHECK_OUT, BOOKING_CONFIRMATION, BOOKING_CANCELLATION, SERVICE_REQUEST, COMPLAINT, PAYMENT_RECEIVED, HOUSEKEEPING_ALERT, SYSTEM |
| `status` | ENUM | DEFAULT 'UNREAD' | UNREAD, READ, ARCHIVED |
| `title` | VARCHAR | NOT NULL | Notification title |
| `message` | TEXT | NOT NULL | Notification message |
| `metadata` | JSON | NULL | Additional data |
| `link` | VARCHAR | NULL | Deep link URL |
| `read_at` | TIMESTAMP | NULL | Read timestamp |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_notifications_user_status` on `(user_id, status)`
- `idx_notifications_created` on `created_at`

---

#### `email_logs`
Email sending history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Log ID |
| `recipient_email` | VARCHAR | NOT NULL | Recipient email address |
| `recipient_name` | VARCHAR | NULL | Recipient name |
| `type` | ENUM | NOT NULL | WELCOME, BOOKING_CONFIRMATION, CHECK_IN_REMINDER, CHECK_OUT_THANK_YOU, LOYALTY_DISCOUNT, PROMOTIONAL, PASSWORD_RESET |
| `status` | ENUM | DEFAULT 'QUEUED' | QUEUED, SENT, FAILED, BOUNCED |
| `subject` | VARCHAR | NOT NULL | Email subject |
| `body` | TEXT | NOT NULL | Email body (HTML) |
| `sendgrid_id` | VARCHAR | UNIQUE, NULL | SendGrid message ID |
| `sent_at` | TIMESTAMP | NULL | Sent timestamp |
| `opened_at` | TIMESTAMP | NULL | Opened timestamp (via tracking) |
| `clicked_at` | TIMESTAMP | NULL | Clicked timestamp |
| `error_message` | TEXT | NULL | Error message (if failed) |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_email_logs_recipient` on `recipient_email`
- `idx_email_logs_status` on `status`
- `idx_email_logs_type` on `type`

---

#### `loyalty_discounts`
Loyalty discount code management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Discount ID |
| `code` | VARCHAR | UNIQUE, NOT NULL | Discount code (SMITH1234) |
| `description` | VARCHAR | NOT NULL | Description |
| `discount_type` | VARCHAR | NOT NULL | percentage, fixed |
| `discount_value` | DECIMAL(10,2) | NOT NULL | Discount value (10 = 10% or $10) |
| `min_stays` | INTEGER | NULL | Minimum stays required |
| `valid_from` | TIMESTAMP | NOT NULL | Valid start date |
| `valid_until` | TIMESTAMP | NOT NULL | Valid end date |
| `max_uses` | INTEGER | NULL | Maximum usage limit |
| `used_count` | INTEGER | DEFAULT 0 | Times used |
| `is_active` | BOOLEAN | DEFAULT true | Active status |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMP | AUTO | Auto-updated timestamp |

**Indexes:**
- `idx_loyalty_code` on `code`
- `idx_loyalty_validity` on `(valid_from, valid_until)`

---

### 7. Analytics & Auditing

#### `audit_logs`
System action tracking for compliance.

> ℹ️ The `AuditLog` model lives in `apps/api/prisma/schema.prisma` and maps to this
> table (created by the `20260427091801_init` migration). It has no foreign key on
> `user_id` by design — audit rows survive user deletion. There is intentionally no
> `updated_at` column (rows are immutable).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Log ID |
| `user_id` | UUID | NULL | User who performed action |
| `action` | VARCHAR | NOT NULL | Action type (create, update, delete) |
| `entity` | VARCHAR | NOT NULL | Entity type (booking, room, user) |
| `entity_id` | VARCHAR | NOT NULL | Entity ID |
| `changes` | JSON | NULL | Old and new values |
| `ip_address` | VARCHAR | NULL | IP address |
| `user_agent` | VARCHAR | NULL | User agent string |
| `created_at` | TIMESTAMP | DEFAULT now() | Action timestamp |

**Indexes:**
- `idx_audit_user` on `user_id`
- `idx_audit_entity` on `(entity, entity_id)`
- `idx_audit_created` on `created_at`

---

### 8. Ratings & Feedback

#### `ratings`
Post-stay guest reviews, one per booking. Added by the `20260617000000_add_ratings_feature` migration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Rating ID |
| `booking_id` | UUID | FK (bookings), UNIQUE | Rated booking (one rating per booking) |
| `guest_id` | UUID | FK (guests), NOT NULL | Guest who left the rating |
| `overall_rating` | INTEGER | NOT NULL | Overall rating (1-5) |
| `room_rating` | INTEGER | NOT NULL | Room rating (1-5) |
| `comment` | TEXT | NULL | Free-text review |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMP | AUTO | Auto-updated timestamp |

**Indexes:**
- `idx_ratings_booking` on `booking_id` (UNIQUE)
- `idx_ratings_guest` on `guest_id`
- `idx_ratings_overall` on `overall_rating`

> Note: service-level ratings live on `service_requests` (`service_rating`,
> `rating_comment`, `rated_at`); this table holds the booking/stay-level rating.

---

## Key Design Decisions

1. **UUIDs for Primary Keys:** Better for distributed systems, no auto-increment collisions
2. **Soft Deletes:** Not implemented initially (can add `deleted_at` column later)
3. **ENUM Types:** Used for status fields to enforce valid values at database level
4. **JSON Columns:** Used sparingly (metadata, changes) where structure is flexible
5. **Indexes:** Strategic indexes on foreign keys and frequently queried columns
6. **Timestamps:** All tables have `created_at`, most have `updated_at`
7. **Decimal for Money:** DECIMAL(10,2) for all currency values to avoid floating-point errors

---

## Prisma Schema Location

Full Prisma schema: `apps/api/prisma/schema.prisma`

To generate migrations:
```bash
cd apps/api
npx prisma migrate dev --name <migration_name>
```

To view database:
```bash
npx prisma studio
```
