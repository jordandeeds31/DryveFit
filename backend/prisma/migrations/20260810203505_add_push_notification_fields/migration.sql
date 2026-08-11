-- AlterTable
ALTER TABLE "users" ADD COLUMN     "expoPushToken" TEXT,
ADD COLUMN     "lastWorkoutReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT;
