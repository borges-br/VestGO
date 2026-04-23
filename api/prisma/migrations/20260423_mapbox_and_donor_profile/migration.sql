ALTER TABLE "users"
ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "donationInterestCategories" "ItemCategory"[] NOT NULL DEFAULT ARRAY[]::"ItemCategory"[];
