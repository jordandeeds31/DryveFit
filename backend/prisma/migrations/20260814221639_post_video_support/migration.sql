/*
  Warnings:

  - You are about to drop the column `imagePublicId` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `posts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "posts" DROP COLUMN "imagePublicId",
DROP COLUMN "imageUrl",
ADD COLUMN     "mediaPublicId" TEXT,
ADD COLUMN     "mediaType" TEXT,
ADD COLUMN     "mediaUrl" TEXT;
