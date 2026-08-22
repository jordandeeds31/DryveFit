-- CreateTable
CREATE TABLE "body_scans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "weightKg" INTEGER NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "bodyFatPercentage" DOUBLE PRECISION NOT NULL,
    "bodyFatCategory" TEXT NOT NULL,
    "leanMassKg" DOUBLE PRECISION NOT NULL,
    "muscleScore" INTEGER NOT NULL,
    "bodyType" TEXT NOT NULL,
    "symmetryScore" INTEGER NOT NULL,
    "fitnessScore" INTEGER NOT NULL,
    "postureNotes" JSONB NOT NULL,
    "circumferences" JSONB NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "bmi" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_scans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "body_scans_userId_createdAt_idx" ON "body_scans"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "body_scans" ADD CONSTRAINT "body_scans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
