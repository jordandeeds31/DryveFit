-- AlterTable
ALTER TABLE "users" ADD COLUMN     "city" TEXT,
ADD COLUMN     "isLeaderboardVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE INDEX "exercise_logs_exerciseName_idx" ON "exercise_logs"("exerciseName");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_city_idx" ON "users"("city");

