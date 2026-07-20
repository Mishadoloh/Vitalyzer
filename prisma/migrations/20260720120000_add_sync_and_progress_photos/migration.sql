CREATE TABLE "SyncedHabitState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SyncedHabitState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProgressPhoto" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "weightKg" DOUBLE PRECISION,
  "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
  "image" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProgressPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SyncedHabitState_userId_key" ON "SyncedHabitState"("userId");
CREATE INDEX "ProgressPhoto_userId_date_idx" ON "ProgressPhoto"("userId", "date");
ALTER TABLE "SyncedHabitState" ADD CONSTRAINT "SyncedHabitState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgressPhoto" ADD CONSTRAINT "ProgressPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
