ALTER TABLE "Settings" ADD COLUMN "emailDigestEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "emailDigestAddress" TEXT;
ALTER TABLE "Settings" ADD COLUMN "emailDigestFrequency" TEXT NOT NULL DEFAULT 'weekly';
ALTER TABLE "Settings" ADD COLUMN "emailDigestLastSentAt" TIMESTAMP(3);
