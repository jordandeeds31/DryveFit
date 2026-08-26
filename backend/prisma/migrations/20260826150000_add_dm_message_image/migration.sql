-- AlterTable
ALTER TABLE "dm_messages" ALTER COLUMN "content" DROP NOT NULL;
ALTER TABLE "dm_messages" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "dm_messages" ADD COLUMN "imagePublicId" TEXT;
