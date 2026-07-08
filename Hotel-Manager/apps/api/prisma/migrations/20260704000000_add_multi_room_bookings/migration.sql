-- Multi-room bookings: one booking now holds N rooms via the booking_rooms join table.
-- Data-preserving: every existing booking is backfilled to exactly one booking_rooms row
-- BEFORE bookings.room_id / bookings.room_rate are dropped.

-- CreateTable
CREATE TABLE "booking_rooms" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "room_rate" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_rooms_booking_id_room_id_key" ON "booking_rooms"("booking_id", "room_id");

-- CreateIndex
CREATE INDEX "booking_rooms_booking_id_idx" ON "booking_rooms"("booking_id");

-- CreateIndex
CREATE INDEX "booking_rooms_room_id_idx" ON "booking_rooms"("room_id");

-- AddForeignKey
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: one row per existing booking, preserving its room + rate snapshot
INSERT INTO "booking_rooms" ("id", "booking_id", "room_id", "room_rate", "created_at")
SELECT gen_random_uuid()::text, "id", "room_id", "room_rate", CURRENT_TIMESTAMP
FROM "bookings";

-- Drop the single-room columns from bookings
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_room_id_fkey";

DROP INDEX "bookings_room_id_idx";

ALTER TABLE "bookings" DROP COLUMN "room_id",
DROP COLUMN "room_rate";
