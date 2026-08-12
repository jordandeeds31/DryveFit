-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- DropIndex
DROP INDEX "chat_messages_userId_createdAt_idx";

-- AlterTable: nullable for now, backfilled below, then locked to NOT NULL
ALTER TABLE "chat_messages" ADD COLUMN     "conversationId" TEXT;

-- Backfill: one Conversation per user who already has chat history,
-- titled from their earliest message, spanning their full existing
-- history — so nothing is lost when conversationId becomes required.
INSERT INTO "conversations" ("id", "userId", "title", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    agg."userId",
    CASE
        WHEN length(first_msg.content) > 60 THEN left(first_msg.content, 59) || '…'
        ELSE first_msg.content
    END,
    agg."minCreatedAt",
    agg."maxCreatedAt"
FROM (
    SELECT "userId", MIN("createdAt") AS "minCreatedAt", MAX("createdAt") AS "maxCreatedAt"
    FROM "chat_messages"
    GROUP BY "userId"
) agg
JOIN LATERAL (
    SELECT content
    FROM "chat_messages" cm
    WHERE cm."userId" = agg."userId"
    ORDER BY cm."createdAt" ASC
    LIMIT 1
) first_msg ON true;

UPDATE "chat_messages" cm
SET "conversationId" = c."id"
FROM "conversations" c
WHERE c."userId" = cm."userId";

-- AlterTable
ALTER TABLE "chat_messages" ALTER COLUMN "conversationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "conversations_userId_updatedAt_idx" ON "conversations"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_createdAt_idx" ON "chat_messages"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
