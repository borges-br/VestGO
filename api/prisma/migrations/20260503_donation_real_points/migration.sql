-- AlterEnum: extend ItemCategory with TOYS and FOOD
ALTER TYPE "ItemCategory" ADD VALUE IF NOT EXISTS 'TOYS';
ALTER TYPE "ItemCategory" ADD VALUE IF NOT EXISTS 'FOOD';

-- AlterEnum: extend PointLedgerSourceType with donation lifecycle entries
ALTER TYPE "PointLedgerSourceType" ADD VALUE IF NOT EXISTS 'DONATION_CONFIRMATION';
ALTER TYPE "PointLedgerSourceType" ADD VALUE IF NOT EXISTS 'DONATION_DISTRIBUTION';

-- CreateEnum
CREATE TYPE "DonationItemCondition" AS ENUM ('EXCELLENT', 'GOOD');

-- CreateEnum
CREATE TYPE "DonationPackageType" AS ENUM ('BAG', 'BOX');

-- CreateEnum
CREATE TYPE "DonationPackageSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- AlterTable: add condition to donation_items, defaults to GOOD for legacy rows
ALTER TABLE "donation_items"
  ADD COLUMN "condition" "DonationItemCondition" NOT NULL DEFAULT 'GOOD';

-- CreateTable: donation_packages
CREATE TABLE "donation_packages" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "type" "DonationPackageType" NOT NULL,
    "size" "DonationPackageSize" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "donation_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "donation_packages_donationId_idx" ON "donation_packages"("donationId");

-- AddForeignKey
ALTER TABLE "donation_packages"
  ADD CONSTRAINT "donation_packages_donationId_fkey"
  FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
