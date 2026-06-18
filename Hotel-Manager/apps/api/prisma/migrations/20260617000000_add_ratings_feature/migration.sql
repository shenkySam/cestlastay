-- Add rating fields to service_requests
ALTER TABLE "service_requests" ADD COLUMN "service_rating" INTEGER;
ALTER TABLE "service_requests" ADD COLUMN "rating_comment" TEXT;
ALTER TABLE "service_requests" ADD COLUMN "rated_at" TIMESTAMP(3);

-- Create ratings table
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "guest_id" TEXT NOT NULL,
    "overall_rating" INTEGER NOT NULL,
    "room_rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one rating per booking
CREATE UNIQUE INDEX "ratings_booking_id_key" ON "ratings"("booking_id");

-- Indexes
CREATE INDEX "ratings_guest_id_idx" ON "ratings"("guest_id");
CREATE INDEX "ratings_overall_rating_idx" ON "ratings"("overall_rating");

-- Foreign keys
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ratings" ADD CONSTRAINT "ratings_guest_id_fkey"
    FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
