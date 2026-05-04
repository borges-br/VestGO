-- AlterEnum
ALTER TYPE "UserTokenType" ADD VALUE 'ACCOUNT_DELETION';

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "anonymizedAt" TIMESTAMP(3);
