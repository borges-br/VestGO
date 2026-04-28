-- CreateEnum
CREATE TYPE "OperationalBatchStatus" AS ENUM (
  'OPEN',
  'READY_TO_SHIP',
  'IN_TRANSIT',
  'DELIVERED',
  'CLOSED',
  'CANCELLED'
);

-- CreateTable
CREATE TABLE "operational_batches" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "collectionPointId" TEXT NOT NULL,
  "ngoId" TEXT NOT NULL,
  "primaryCategory" "ItemCategory",
  "status" "OperationalBatchStatus" NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "dispatchedById" TEXT,
  "deliveredById" TEXT,
  "dispatchedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operational_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_batch_items" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "donationId" TEXT NOT NULL,
  "addedById" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operational_batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operational_batches_code_key"
ON "operational_batches"("code");

-- CreateIndex
CREATE INDEX "operational_batches_collectionPointId_status_createdAt_idx"
ON "operational_batches"("collectionPointId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "operational_batches_ngoId_status_createdAt_idx"
ON "operational_batches"("ngoId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "operational_batch_items_donationId_key"
ON "operational_batch_items"("donationId");

-- CreateIndex
CREATE INDEX "operational_batch_items_batchId_idx"
ON "operational_batch_items"("batchId");

-- AddForeignKey
ALTER TABLE "operational_batches"
ADD CONSTRAINT "operational_batches_collectionPointId_fkey"
FOREIGN KEY ("collectionPointId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_batches"
ADD CONSTRAINT "operational_batches_ngoId_fkey"
FOREIGN KEY ("ngoId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_batches"
ADD CONSTRAINT "operational_batches_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_batches"
ADD CONSTRAINT "operational_batches_dispatchedById_fkey"
FOREIGN KEY ("dispatchedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_batches"
ADD CONSTRAINT "operational_batches_deliveredById_fkey"
FOREIGN KEY ("deliveredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_batch_items"
ADD CONSTRAINT "operational_batch_items_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "operational_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_batch_items"
ADD CONSTRAINT "operational_batch_items_donationId_fkey"
FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_batch_items"
ADD CONSTRAINT "operational_batch_items_addedById_fkey"
FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
