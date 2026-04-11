ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PICKUP_REQUEST_CREATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PICKUP_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PICKUP_REQUEST_STATUS_CHANGED';

CREATE TYPE "PickupRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "pickup_requests" (
    "id" TEXT NOT NULL,
    "operationalPartnershipId" TEXT NOT NULL,
    "collectionPointId" TEXT NOT NULL,
    "ngoId" TEXT NOT NULL,
    "status" "PickupRequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "responseNotes" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pickup_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pickup_requests_collectionPointId_status_createdAt_idx" ON "pickup_requests"("collectionPointId", "status", "createdAt");
CREATE INDEX "pickup_requests_ngoId_status_createdAt_idx" ON "pickup_requests"("ngoId", "status", "createdAt");
CREATE INDEX "pickup_requests_operationalPartnershipId_status_createdAt_idx" ON "pickup_requests"("operationalPartnershipId", "status", "createdAt");

ALTER TABLE "pickup_requests"
ADD CONSTRAINT "pickup_requests_operationalPartnershipId_fkey"
FOREIGN KEY ("operationalPartnershipId") REFERENCES "operational_partnerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pickup_requests"
ADD CONSTRAINT "pickup_requests_collectionPointId_fkey"
FOREIGN KEY ("collectionPointId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pickup_requests"
ADD CONSTRAINT "pickup_requests_ngoId_fkey"
FOREIGN KEY ("ngoId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
