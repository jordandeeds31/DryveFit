-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "equipmentAccess" TEXT NOT NULL DEFAULT 'full gym',
ADD COLUMN     "trainingGoal" TEXT NOT NULL DEFAULT 'general fitness';
