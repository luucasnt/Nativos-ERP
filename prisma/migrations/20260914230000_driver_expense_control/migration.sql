CREATE TABLE IF NOT EXISTS "vehicle_expense_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "vehicle_id" UUID NOT NULL,
  "expected_km_per_liter" DECIMAL(6,2) NOT NULL,
  "alert_below_km_per_liter" DECIMAL(6,2),
  "alert_above_km_per_liter" DECIMAL(6,2),
  "tank_capacity_liters" DECIMAL(8,2),
  "require_receipt" BOOLEAN NOT NULL DEFAULT true,
  "require_odometer" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vehicle_expense_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vehicle_expense_policies_vehicle_id_key" UNIQUE ("vehicle_id"),
  CONSTRAINT "vehicle_expense_policies_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "service_expenses"
  ADD COLUMN IF NOT EXISTS "vehicle_id" UUID,
  ADD COLUMN IF NOT EXISTS "expense_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "odometer_km" INTEGER,
  ADD COLUMN IF NOT EXISTS "quantity" DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS "unit_price" DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS "calculated_km_per_liter" DECIMAL(8,3),
  ADD COLUMN IF NOT EXISTS "fuel_type" TEXT,
  ADD COLUMN IF NOT EXISTS "invoice_number" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "direct_collections"
  ADD COLUMN IF NOT EXISTS "receipt_url" TEXT;

ALTER TABLE "service_expenses" ALTER COLUMN "service_id" DROP NOT NULL;

ALTER TABLE "vehicles"
  ADD COLUMN IF NOT EXISTS "initial_odometer_km" INTEGER,
  ADD COLUMN IF NOT EXISTS "odometer_updated_at" TIMESTAMP(3);

ALTER TABLE "service_expenses"
  ADD CONSTRAINT "service_expenses_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "service_expenses_vehicle_id_expense_date_idx" ON "service_expenses"("vehicle_id", "expense_date");
CREATE INDEX IF NOT EXISTS "service_expenses_vehicle_id_odometer_km_idx" ON "service_expenses"("vehicle_id", "odometer_km");

ALTER TABLE "vehicle_expense_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_expenses" ENABLE ROW LEVEL SECURITY;

INSERT INTO "catalog_items" ("id", "type", "key", "label", "order", "active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'categoria_despesa', 'lavagem', 'Lavagem e higienização', 2, true, now(), now()),
  (gen_random_uuid(), 'categoria_despesa', 'balsa', 'Balsa', 3, true, now(), now()),
  (gen_random_uuid(), 'categoria_despesa', 'manutencao', 'Manutenção', 4, true, now(), now()),
  (gen_random_uuid(), 'categoria_despesa', 'lanche', 'Lanche', 7, true, now(), now()),
  (gen_random_uuid(), 'categoria_despesa', 'agua', 'Água e bebidas', 8, true, now(), now()),
  (gen_random_uuid(), 'categoria_despesa', 'almoco', 'Almoço/refeição', 9, true, now(), now())
ON CONFLICT ("type", "key") DO UPDATE SET "label" = EXCLUDED."label", "order" = EXCLUDED."order", "active" = true, "updated_at" = now();
