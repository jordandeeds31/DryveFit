ALTER TABLE "follows" ADD COLUMN "notifyOnNewPost" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "notifications" ADD COLUMN "blogPostId" TEXT;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_blogPostId_fkey"
  FOREIGN KEY ("blogPostId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
