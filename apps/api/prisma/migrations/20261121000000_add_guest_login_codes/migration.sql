-- AlterEnum
ALTER TYPE "EmailType" ADD VALUE 'GUEST_LOGIN_CODE';

-- CreateEnum
CREATE TYPE "GuestLoginCodePurpose" AS ENUM ('OTP', 'HANDOFF');

-- CreateTable
CREATE TABLE "guest_login_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "booking_id" TEXT,
    "purpose" "GuestLoginCodePurpose" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guest_login_codes_email_purpose_idx" ON "guest_login_codes"("email", "purpose");

-- CreateIndex
CREATE INDEX "guest_login_codes_code_hash_idx" ON "guest_login_codes"("code_hash");
