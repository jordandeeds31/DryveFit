-- AlterTable
ALTER TABLE "exercise_logs" ADD COLUMN     "programExerciseId" TEXT;

-- AddForeignKey
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_programExerciseId_fkey" FOREIGN KEY ("programExerciseId") REFERENCES "program_exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;
