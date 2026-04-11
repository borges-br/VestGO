-- CreateEnum
CREATE TYPE "OperationalPartnershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- AlterTable
ALTER TABLE "operational_partnerships"
ADD COLUMN "status" "OperationalPartnershipStatus" NOT NULL DEFAULT 'PENDING';

-- Backfill existing active links
UPDATE "operational_partnerships"
SET "status" = CASE
  WHEN "isActive" = true THEN 'ACTIVE'::"OperationalPartnershipStatus"
  ELSE 'REJECTED'::"OperationalPartnershipStatus"
END;

-- Align defaults with the new workflow
ALTER TABLE "operational_partnerships"
ALTER COLUMN "isActive" SET DEFAULT false;

-- Replace legacy indexes
DROP INDEX IF EXISTS "operational_partnerships_collectionPointId_isActive_priority_idx";
DROP INDEX IF EXISTS "operational_partnerships_ngoId_isActive_priority_idx";

CREATE INDEX "operational_partnerships_collectionPointId_status_priority_idx"
ON "operational_partnerships"("collectionPointId", "status", "priority");

CREATE INDEX "operational_partnerships_ngoId_status_priority_idx"
ON "operational_partnerships"("ngoId", "status", "priority");
