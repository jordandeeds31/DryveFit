/*
  Warnings:

  - You are about to drop the column `image` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `imageMimeType` on the `posts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "posts" DROP COLUMN "image",
DROP COLUMN "imageMimeType",
ADD COLUMN     "imageUrl" TEXT;
