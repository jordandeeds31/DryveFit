/*
  Warnings:

  - Changed the type of `reps` on the `program_exercises` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "program_exercises" DROP COLUMN "reps",
ADD COLUMN     "reps" INTEGER NOT NULL;
