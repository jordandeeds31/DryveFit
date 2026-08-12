-- Backs the landing page's email capture (POST /api/waitlist) — added on
-- main (commit 07ec2ce) before this branch existed. Recreated here byte-
-- for-byte to reconcile this branch's migration history with what's
-- already applied in production.

-- CreateTable
CREATE TABLE "waitlist_signups" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_signups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_signups_email_key" ON "waitlist_signups"("email");
