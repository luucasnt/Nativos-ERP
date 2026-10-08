-- A third-party driver has no remuneration contract with Nativos.
-- Existing financial history is retained; only driver configuration changes.
ALTER TABLE "drivers" ALTER COLUMN "payment_type" DROP NOT NULL;
UPDATE "drivers" SET "payment_type" = NULL, "commission" = NULL,
  "daily_rate" = NULL, "salario_mensal" = NULL, "updated_at" = CURRENT_TIMESTAMP
WHERE "owner_type" = 'terceirizado';
