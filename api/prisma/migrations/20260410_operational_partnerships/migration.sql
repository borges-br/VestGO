-- CreateTable
CREATE TABLE "operational_partnerships" (
    "id" TEXT NOT NULL,
    "collectionPointId" TEXT NOT NULL,
    "ngoId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_partnerships_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "donations" ADD COLUMN "operationalPartnershipId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "operational_partnerships_collectionPointId_ngoId_key"
ON "operational_partnerships"("collectionPointId", "ngoId");

-- CreateIndex
CREATE INDEX "operational_partnerships_collectionPointId_isActive_priority_idx"
ON "operational_partnerships"("collectionPointId", "isActive", "priority");

-- CreateIndex
CREATE INDEX "operational_partnerships_ngoId_isActive_priority_idx"
ON "operational_partnerships"("ngoId", "isActive", "priority");

-- Backfill partnerships for existing donation pairs
INSERT INTO "operational_partnerships" (
    "id",
    "collectionPointId",
    "ngoId",
    "isActive",
    "priority",
    "createdAt",
    "updatedAt"
)
SELECT
    CONCAT('op_', md5("collectionPointId" || ':' || "ngoId")),
    "collectionPointId",
    "ngoId",
    true,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "donations"
WHERE "collectionPointId" IS NOT NULL
  AND "ngoId" IS NOT NULL
GROUP BY "collectionPointId", "ngoId"
ON CONFLICT ("collectionPointId", "ngoId") DO NOTHING;

-- Backfill donation partnership ids
UPDATE "donations" AS d
SET "operationalPartnershipId" = op."id"
FROM "operational_partnerships" AS op
WHERE d."collectionPointId" = op."collectionPointId"
  AND d."ngoId" = op."ngoId"
  AND d."operationalPartnershipId" IS NULL;

-- AddForeignKey
ALTER TABLE "operational_partnerships"
ADD CONSTRAINT "operational_partnerships_collectionPointId_fkey"
FOREIGN KEY ("collectionPointId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_partnerships"
ADD CONSTRAINT "operational_partnerships_ngoId_fkey"
FOREIGN KEY ("ngoId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations"
ADD CONSTRAINT "donations_operationalPartnershipId_fkey"
FOREIGN KEY ("operationalPartnershipId") REFERENCES "operational_partnerships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
