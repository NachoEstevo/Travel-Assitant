/*
  Warnings:

  - Added the required column `departureDate` to the `ScheduledTask` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destination` to the `ScheduledTask` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `ScheduledTask` table without a default value. This is not possible if the table is not empty.
  - Added the required column `origin` to the `ScheduledTask` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ScheduledTask" ADD COLUMN     "adults" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "departureDate" TEXT NOT NULL,
ADD COLUMN     "destination" TEXT NOT NULL,
ADD COLUMN     "lowestPrice" DOUBLE PRECISION,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "origin" TEXT NOT NULL,
ADD COLUMN     "returnDate" TEXT,
ADD COLUMN     "travelClass" TEXT NOT NULL DEFAULT 'ECONOMY',
ALTER COLUMN "searchId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "airlines" TEXT[],
    "stops" INTEGER NOT NULL DEFAULT 0,
    "duration" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceHistory_taskId_idx" ON "PriceHistory"("taskId");

-- CreateIndex
CREATE INDEX "PriceHistory_recordedAt_idx" ON "PriceHistory"("recordedAt");

-- CreateIndex
CREATE INDEX "ScheduledTask_active_idx" ON "ScheduledTask"("active");

-- CreateIndex
CREATE INDEX "ScheduledTask_nextRun_idx" ON "ScheduledTask"("nextRun");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ScheduledTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
