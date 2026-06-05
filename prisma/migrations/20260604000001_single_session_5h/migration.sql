-- AlterTable
ALTER TABLE "User" ADD COLUMN "activeSessionId" TEXT;
ALTER TABLE "User" ADD COLUMN "activeSessionExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_activeSessionId_key" ON "User"("activeSessionId");
