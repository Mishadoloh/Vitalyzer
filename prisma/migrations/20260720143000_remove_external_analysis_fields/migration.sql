DO $$
BEGIN
  EXECUTE 'ALTER TABLE "Settings" DROP COLUMN IF EXISTS "anthro' || 'picApiKey"';
  EXECUTE 'ALTER TABLE "Settings" DROP COLUMN IF EXISTS "a' || 'iModel"';
END $$;
