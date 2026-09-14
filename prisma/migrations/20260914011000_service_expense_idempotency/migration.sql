ALTER TABLE "public"."service_expenses"
  ADD COLUMN IF NOT EXISTS "dedupe_key" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "service_expenses_dedupe_key_key"
  ON "public"."service_expenses" ("dedupe_key");
