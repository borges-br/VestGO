-- CreateEnum
CREATE TYPE "PublicProfileState" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'VERIFIED');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "coverImageUrl" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "purpose" TEXT,
ADD COLUMN "neighborhood" TEXT,
ADD COLUMN "zipCode" TEXT,
ADD COLUMN "openingHours" TEXT,
ADD COLUMN "publicNotes" TEXT,
ADD COLUMN "operationalNotes" TEXT,
ADD COLUMN "accessibilityDetails" TEXT,
ADD COLUMN "verificationNotes" TEXT,
ADD COLUMN "estimatedCapacity" TEXT,
ADD COLUMN "serviceRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "rules" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "nonAcceptedItems" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "publicProfileState" "PublicProfileState" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "verifiedAt" TIMESTAMP(3);

-- Backfill
UPDATE "users"
SET "publicProfileState" = CASE
  WHEN "role" IN ('COLLECTION_POINT', 'NGO') AND "organizationName" IS NOT NULL THEN 'ACTIVE'::"PublicProfileState"
  ELSE 'DRAFT'::"PublicProfileState"
END;
