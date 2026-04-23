ALTER TABLE "users"
ADD COLUMN "galleryImageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "users"
SET
  "serviceRegions" = COALESCE("serviceRegions", ARRAY[]::TEXT[]),
  "rules" = COALESCE("rules", ARRAY[]::TEXT[]),
  "nonAcceptedItems" = COALESCE("nonAcceptedItems", ARRAY[]::TEXT[]),
  "acceptedCategories" = COALESCE("acceptedCategories", ARRAY[]::"ItemCategory"[]);

ALTER TABLE "users"
ALTER COLUMN "serviceRegions" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "serviceRegions" SET NOT NULL,
ALTER COLUMN "rules" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "rules" SET NOT NULL,
ALTER COLUMN "nonAcceptedItems" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "nonAcceptedItems" SET NOT NULL,
ALTER COLUMN "acceptedCategories" SET DEFAULT ARRAY[]::"ItemCategory"[],
ALTER COLUMN "acceptedCategories" SET NOT NULL;

WITH ranked_active_partnerships AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "collectionPointId"
      ORDER BY "priority" ASC, "createdAt" ASC, "id" ASC
    ) AS "position"
  FROM "operational_partnerships"
  WHERE "status" = 'ACTIVE'::"OperationalPartnershipStatus"
    AND "isActive" = true
)
UPDATE "operational_partnerships" AS op
SET
  "status" = 'REJECTED'::"OperationalPartnershipStatus",
  "isActive" = false,
  "updatedAt" = CURRENT_TIMESTAMP
FROM ranked_active_partnerships AS ranked
WHERE op."id" = ranked."id"
  AND ranked."position" > 1;

CREATE UNIQUE INDEX "operational_partnerships_one_active_collection_point_idx"
ON "operational_partnerships" ("collectionPointId")
WHERE "status" = 'ACTIVE'::"OperationalPartnershipStatus"
  AND "isActive" = true;
