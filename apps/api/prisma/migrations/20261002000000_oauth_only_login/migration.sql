-- Sign-in moves to Google / Apple only (password login removed).
-- Additive + relaxing only: links provider subject IDs to users, and makes
-- password_hash nullable so new users no longer need one. Existing hashes are
-- left in place (unused) so a code rollback still works; drop the column later.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "google_id" TEXT,
ADD COLUMN "apple_id" TEXT,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_apple_id_key" ON "users"("apple_id");
