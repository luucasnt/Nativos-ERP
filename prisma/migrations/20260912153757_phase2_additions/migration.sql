-- CreateEnum
CREATE TYPE "CommissionDefaultTarget" AS ENUM ('company', 'driver');

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "voucher_show_price" BOOLEAN;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "os_show_price" BOOLEAN,
ADD COLUMN     "reception_passenger_name" TEXT,
ADD COLUMN     "reception_sign_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "started_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "commission_defaults" (
    "id" UUID NOT NULL,
    "target" "CommissionDefaultTarget" NOT NULL,
    "category_key" TEXT NOT NULL,
    "commission_percent" DECIMAL(5,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_defaults_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commission_defaults_target_category_key_key" ON "commission_defaults"("target", "category_key");

-- RLS: commission_defaults é uma tabela de configuração interna (requisito
-- adicional pós-Fase 1, item 4), sem visibilidade de portal.
ALTER TABLE "commission_defaults" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_defaults" FORCE ROW LEVEL SECURITY;

CREATE POLICY "commission_defaults_all_internal" ON "commission_defaults"
  FOR ALL USING (app_is_internal()) WITH CHECK (app_is_internal());

GRANT SELECT, INSERT, UPDATE, DELETE ON "commission_defaults" TO authenticated;
GRANT ALL ON "commission_defaults" TO service_role;
