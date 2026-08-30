-- CreateTable
CREATE TABLE "daily_analyses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dayType" TEXT NOT NULL,
    "nutritionStatus" TEXT,
    "proteinStatus" TEXT,
    "workoutStatus" TEXT,
    "netContribution" TEXT,
    "headline" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "adjustments" JSONB,
    "rawInputs" JSONB NOT NULL,
    "viewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_analyses_userId_date_key" ON "daily_analyses"("userId", "date");

-- AddForeignKey
ALTER TABLE "daily_analyses" ADD CONSTRAINT "daily_analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
