# WebSocket Events

Real-time communication in HMS uses a **single Socket.IO gateway** on the default namespace `/` (no sub-namespaces). All events flow through `NotificationsGateway`.

**Server URL:** `VITE_SOCKET_URL` (dev: `http://localhost:3000`; prod: the bare Railway API origin, **no** `/api/v1`)

---

## Architecture

```
NotificationsGateway (namespace: "/")
  ├── handshake middleware: verifies the JWT, rejects with UNAUTHORIZED
  ├── handles: subscribe / unsubscribe (client → server)
  ├── emits:  notification:new       → targeted to user:<userId> room
  ├── emits:  room:status-changed    → "staff" room (ADMIN + STAFF only)
  ├── emits:  booking:checked-in     → "staff" room (ADMIN + STAFF only)
  └── emits:  booking:checked-out    → "staff" room (ADMIN + STAFF only)

RoomsGateway     → delegates to NotificationsGateway
BookingsGateway  → delegates to NotificationsGateway
```

---

## Authentication (Server)

Sockets are authenticated **during the handshake** by a `server.use()` middleware registered in `NotificationsGateway.afterInit()`, not in `handleConnection`. A rejected client never gets message handlers bound, and receives a `connect_error` with message `UNAUTHORIZED`.

The check mirrors `JwtStrategy.validate()` so socket access matches HTTP access:

1. The token is read from `handshake.auth.token` (a leading `Bearer ` is stripped), then the `Authorization: Bearer …` header, then `?token=` in the query string.
2. It is verified with `JWT_SECRET`. If `JWT_SECRET` is unset, the gateway logs an error at startup and every handshake is rejected.
3. **Staff/admin tokens:** `sub` must be an existing user with `status = ACTIVE`.
4. **Guest tokens** (`role: GUEST`): must carry a `bookingId`, and that booking must belong to the guest in `sub`.

On connect, ADMIN and STAFF sockets automatically join two rooms: `staff` (hotel-wide events) and `user:<userId>` (their own notifications). **Guest sockets join no rooms**: their `sub` is a guestId, so `user:<id>` would be the wrong room, and hotel-wide events are staff business. A guest can connect but receives nothing.

---

## Connection (Frontend)

```typescript
// apps/web/src/lib/socket.ts (simplified)
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
  // Function form: called before EVERY (re)connect, so a token refreshed by
  // api.ts (written to localStorage) is picked up without rebuilding the socket.
  auth: (cb) => cb({ token: localStorage.getItem('accessToken') ?? fallbackToken ?? null }),
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});
```

Managed by `SocketContext`, which connects whenever there is a logged-in user with an access token (guests included) and disconnects on logout.

**Rejected handshakes:** socket.io does not retry on its own after the server rejects a handshake (`socket.active === false`). `lib/socket.ts` listens for `connect_error` and, while an access token is still in `localStorage`, re-arms the connection with exponential backoff (2s, doubling, capped at 30s; one pending retry at a time). `disconnectSocket()` clears the timer and resets the delay. Plain transport failures are left to socket.io's own reconnection.

---

## Client → Server Events

### `subscribe`
Join the user-specific room to receive targeted notifications.

```typescript
socket.emit('subscribe', { userId: 'user-uuid' });
// Joins socket room: user:<id from the verified token>
```

The `userId` in the payload is **ignored**. The room is always derived from the verified token, so a client cannot subscribe to another user's notifications. Staff/admin sockets are already in their room from connect time, so this is an idempotent no-op kept for compatibility with the existing client. Guests are ignored.

### `unsubscribe`
Leave the user-specific room (again using the token's id, not the payload's).

```typescript
socket.emit('unsubscribe', { userId: 'user-uuid' });
```

Both are called automatically by `NotificationContext` when a staff/admin user mounts/unmounts (it skips guests).

---

## Server → Client Events

### `notification:new`
**Targeted**: only sent to clients in the `user:<userId>` room.
Fired by `NotificationsService.notifyUser()`. Today every caller goes through `notifyStaff()`, which calls `notifyUser()` once for each ACTIVE ADMIN/STAFF user:
- `ServicesService.create()`: new service request
- `HousekeepingService.create()`: new task created
- `BookingsService.checkIn()`: guest checked in
- `BookingsService.checkOut()`: guest checked out

**Payload:** full `Notification` DB record
```typescript
{
  id: string;
  userId: string;
  type: 'CHECK_IN' | 'CHECK_OUT' | 'SERVICE_REQUEST' | 'HOUSEKEEPING_ALERT' | ...;
  status: 'UNREAD';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  link?: string;
  createdAt: string;
}
```

**Frontend usage (NotificationContext):**
```typescript
socket.on('notification:new', (n: INotification) => {
  setNotifications((prev) => [n, ...prev]);
  toast.success(n.title, { id: n.id });
});
```

`ServiceQueuePage` also listens and reloads its list when `n.type === 'SERVICE_REQUEST'`.

---

### `room:status-changed`
**Staff-scoped**: sent only to the `staff` room (ADMIN + STAFF sockets).
Fired whenever `RoomsService.updateStatus()` is called (via `PATCH /rooms/:id/status`).

**Payload:** full Room object with category included
```typescript
{
  id: string;
  roomNumber: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'MAINTENANCE' | 'OUT_OF_ORDER';
  floor: number;
  category: { id: string; name: string; type: string; basePrice: number; };
  lastCleanedAt?: string;
  maintenanceNotes?: string;
  updatedAt: string;
}
```

**Frontend usage (RoomDashboardPage):**
```typescript
socket.on('room:status-changed', (updatedRoom: IRoom) => {
  setRooms((prev) => prev.map((r) => r.id === updatedRoom.id ? updatedRoom : r));
});
```

---

### `booking:checked-in`
**Staff-scoped**: sent only to the `staff` room (ADMIN + STAFF sockets).
Fired by `BookingsService.checkIn()`.

**Payload:** full Booking object (with guest, rooms, createdBy)

---

### `booking:checked-out`
**Staff-scoped**: sent only to the `staff` room (ADMIN + STAFF sockets).
Fired by `BookingsService.checkOut()`.

**Payload:** full Booking object (with guest, rooms, createdBy)

---

## Notification Types

| Type | Fired when | Target |
|------|-----------|--------|
| `SERVICE_REQUEST` | Guest submits a service request | All ADMIN + STAFF |
| `HOUSEKEEPING_ALERT` | Housekeeping task created | All ADMIN + STAFF |
| `CHECK_IN` | Guest checks in | All ADMIN + STAFF |
| `CHECK_OUT` | Guest checks out | All ADMIN + STAFF |

> The full `NotificationType` enum lives in `apps/api/prisma/schema.prisma`. Only the four rows above produce in-app notifications. `BOOKING_CONFIRMATION` exists as an **email** type: `CrmService` sends it and records it in `email_logs`, not `notifications`. `BOOKING_CANCELLATION`, `COMPLAINT`, `PAYMENT_RECEIVED` and `SYSTEM` are reserved; nothing emits them yet. Stripe payments persist via the webhook only, with no WS broadcast.

---

## Notes

- Notifications are **persisted to the DB** before being pushed, so `GET /notifications` returns them even if the client was offline.
- Staff/admin sockets are placed in their rooms at connect time. The `subscribe` event that `NotificationContext` sends afterwards is redundant but harmless.
- Room and booking events go only to the `staff` room, because booking payloads carry guest PII and the only consumers are staff/admin pages. Guests receive no socket events.
