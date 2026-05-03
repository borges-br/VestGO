-- CreateTable
CREATE TABLE "seasonal_campaigns" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "categories" "ItemCategory"[] NOT NULL DEFAULT ARRAY[]::"ItemCategory"[],
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasonal_campaigns_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "seasonal_campaigns_valid_period_check" CHECK ("endsAt" > "startsAt")
);

-- AlterTable
ALTER TABLE "donations" ADD COLUMN "seasonalCampaignId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "seasonal_campaigns_slug_key" ON "seasonal_campaigns"("slug");

-- CreateIndex
CREATE INDEX "seasonal_campaigns_active_startsAt_endsAt_idx" ON "seasonal_campaigns"("active", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "donations_seasonalCampaignId_idx" ON "donations"("seasonalCampaignId");

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_seasonalCampaignId_fkey" FOREIGN KEY ("seasonalCampaignId") REFERENCES "seasonal_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
