-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "commentId" TEXT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

