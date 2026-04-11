-- Address normalization
ALTER TABLE "users"
ADD COLUMN "addressNumber" TEXT,
ADD COLUMN "addressComplement" TEXT;

-- Notifications
CREATE TYPE "NotificationType" AS ENUM (
  'DONATION_STATUS',
  'DONATION_POINTS',
  'BADGE_EARNED',
  'DONATION_CREATED_FOR_POINT',
  'PARTNERSHIP_REQUEST_RECEIVED',
  'PARTNERSHIP_STATUS_CHANGED'
);

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "payload" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");
CREATE INDEX "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId", "readAt", "createdAt");

ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
