/*
  Warnings:

  - You are about to drop the column `focusArea` on the `programs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "programs" DROP COLUMN "focusArea",
ADD COLUMN     "trainingSplit" TEXT NOT NULL DEFAULT 'full body';
