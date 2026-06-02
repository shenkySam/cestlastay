# WebSocket Events

Real-time communication in HMS uses a **single Socket.IO gateway** on the default namespace `/` (no sub-namespaces). All events flow through `NotificationsGateway`.

**Server URL:** `http://localhost:3000`

---

## Architecture

```
NotificationsGateway (namespace: "/")
  ├── handles: subscribe / unsubscribe (client → server)
  ├── emits:  notification:new       → targeted to user:<userId> room
  ├── emits:  room:status-changed    → broadcast to all clients
  ├── emits:  booking:checked-in     → broadcast to all clients
  └── emits:  booking:checked-out    → broadcast to all clients

RoomsGateway     → delegates to NotificationsGateway
BookingsGateway  → delegates to NotificationsGateway
```

---

## Connection (Frontend)

```typescript
// apps/web/src/lib/socket.ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: accessToken },
});
```

Managed by `SocketContext` — connects when user logs in, disconnects on logout. Guests do **not** connect (their token `sub` is a guestId, not a userId, so user-targeted events would be mis-routed).

---

## Client → Server Events

### `subscribe`
Join the user-specific room to receive targeted notifications.

```typescript
socket.emit('subscribe', { userId: 'user-uuid' });
// Joins socket room: user:<userId>
```

### `unsubscribe`
Leave the user-specific room.

```typescript
socket.emit('unsubscribe', { userId: 'user-uuid' });
```

Both are called automatically by `NotificationContext` when the user mounts/unmounts.

---

## Server → Client Events

### `notification:new`
**Targeted** — only sent to clients in the `user:<userId>` room.
Fired by `NotificationsService.notifyUser()` which is called by:
- `ServicesService.create()` — new service request (notifies all ADMIN + STAFF)
- `HousekeepingService.create()` — new task created (notifies all ADMIN + STAFF)
- `BookingsService.checkIn()` — guest checked in (notifies all ADMIN + STAFF)
- `BookingsService.checkOut()` — guest checked out (notifies all ADMIN + STAFF)

**Payload:** full `Notification` DB record
```typescript
{
  id: string;
  userId: string;
  type: 'CHECK_IN' | 'CHECK_OUT' | 'SERVICE_REQUEST' | 'HOUSEKEEPING_ALERT' | 'BOOKING_CONFIRMATION' | ...;
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

---

### `room:status-changed`
**Broadcast** — sent to all connected clients.
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
**Broadcast** — sent to all connected clients.
Fired by `BookingsService.checkIn()`.

**Payload:** full Booking object (with guest, room, createdBy)

---

### `booking:checked-out`
**Broadcast** — sent to all connected clients.
Fired by `BookingsService.checkOut()`.

**Payload:** full Booking object (with guest, room, createdBy)

---

## Notification Types

| Type | Fired when | Target |
|------|-----------|--------|
| `SERVICE_REQUEST` | Guest submits a service request | All ADMIN + STAFF |
| `HOUSEKEEPING_ALERT` | Housekeeping task created | All ADMIN + STAFF |
| `CHECK_IN` | Guest checks in | All ADMIN + STAFF |
| `CHECK_OUT` | Guest checks out | All ADMIN + STAFF |
| `BOOKING_CONFIRMATION` | Reserved for Phase 5 CRM | Guest |
| `PAYMENT_RECEIVED` | Defined in DB enum but not yet emitted — Phase 4 payments persist via Stripe webhook only, no WS broadcast | Guest + Staff |

---

## Notes

- Notifications are **persisted to the DB** before being pushed — `GET /notifications` will return them even if the client was offline.
- The `subscribe` event must be emitted after connecting. `NotificationContext` handles this automatically for logged-in staff/admin users.
- Room and booking broadcast events are sent to all connected clients regardless of role — the frontend filters what to show.
