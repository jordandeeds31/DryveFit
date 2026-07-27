/*
  Warnings:

  - A unique constraint covering the columns `[programExerciseId]` on the table `exercise_logs` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "exercise_logs_programExerciseId_key" ON "exercise_logs"("programExerciseId");
