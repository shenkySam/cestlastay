-- CreateTable
CREATE TABLE "marketing_opt_outs" (
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_opt_outs_pkey" PRIMARY KEY ("email")
);
