-- CreateEnum
CREATE TYPE "PublicProfileRevisionStatus" AS ENUM ('PENDING', 'REJECTED');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "openingSchedule" JSONB,
ADD COLUMN "openingHoursExceptions" TEXT,
ADD COLUMN "accessibilityFeatures" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "pendingPublicRevision" JSONB,
ADD COLUMN "pendingPublicRevisionStatus" "PublicProfileRevisionStatus",
ADD COLUMN "pendingPublicRevisionFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "pendingPublicRevisionSubmittedAt" TIMESTAMP(3),
ADD COLUMN "pendingPublicRevisionReviewedAt" TIMESTAMP(3),
ADD COLUMN "pendingPublicRevisionReviewNotes" TEXT;

-- AlterTable
ALTER TABLE IF EXISTS "pickup_requests"
ADD COLUMN IF NOT EXISTS "requestedDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "timeWindowStart" TEXT,
ADD COLUMN IF NOT EXISTS "timeWindowEnd" TEXT;
