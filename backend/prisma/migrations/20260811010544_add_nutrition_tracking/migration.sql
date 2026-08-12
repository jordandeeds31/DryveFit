-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activityLevel" TEXT,
ADD COLUMN     "birthdate" TIMESTAMP(3),
ADD COLUMN     "dailyCalorieGoal" INTEGER,
ADD COLUMN     "dailyCarbGoalG" INTEGER,
ADD COLUMN     "dailyFatGoalG" INTEGER,
ADD COLUMN     "dailyProteinGoalG" INTEGER,
ADD COLUMN     "heightInches" DOUBLE PRECISION,
ADD COLUMN     "nutritionGoalType" TEXT,
ADD COLUMN     "weightLbs" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "food_log_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mealType" TEXT NOT NULL,
    "foodName" TEXT NOT NULL,
    "brandName" TEXT,
    "servingQty" DOUBLE PRECISION NOT NULL,
    "servingUnit" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "proteinG" DOUBLE PRECISION NOT NULL,
    "carbsG" DOUBLE PRECISION NOT NULL,
    "fatG" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "food_log_entries_userId_date_idx" ON "food_log_entries"("userId", "date");

-- AddForeignKey
ALTER TABLE "food_log_entries" ADD CONSTRAINT "food_log_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
