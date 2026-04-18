/*
  Warnings:

  - Added the required column `entityId` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "entityId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "notifications_userId_type_entityId_idx" ON "notifications"("userId", "type", "entityId");
