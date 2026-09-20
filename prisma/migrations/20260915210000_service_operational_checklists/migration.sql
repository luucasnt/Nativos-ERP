ALTER TABLE "public"."services"
  ADD COLUMN IF NOT EXISTS "preflight_checklist" JSONB,
  ADD COLUMN IF NOT EXISTS "completion_checklist" JSONB,
  ADD COLUMN IF NOT EXISTS "incident_notes" TEXT;
