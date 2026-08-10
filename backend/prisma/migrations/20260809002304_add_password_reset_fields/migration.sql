-- AlterTable
ALTER TABLE "users" ADD COLUMN     "passwordResetCodeHash" TEXT,
ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3);
