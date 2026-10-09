-- Campos opcionais preservam reservas existentes. Categoria contratada não é inferida do veículo.
ALTER TABLE "reservations" ADD COLUMN "contracted_category_id" UUID, ADD COLUMN "contracted_category_label" TEXT;
ALTER TABLE "services" ADD COLUMN "contracted_category_id" UUID, ADD COLUMN "contracted_category_label" TEXT, ADD COLUMN "upgrade_category_id" UUID, ADD COLUMN "upgrade_category_label" TEXT;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_contracted_category_id_fkey" FOREIGN KEY ("contracted_category_id") REFERENCES "catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "services" ADD CONSTRAINT "services_contracted_category_id_fkey" FOREIGN KEY ("contracted_category_id") REFERENCES "catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "services" ADD CONSTRAINT "services_upgrade_category_id_fkey" FOREIGN KEY ("upgrade_category_id") REFERENCES "catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "reservations_contracted_category_id_idx" ON "reservations"("contracted_category_id");
CREATE INDEX "services_contracted_category_id_idx" ON "services"("contracted_category_id");
CREATE INDEX "services_upgrade_category_id_idx" ON "services"("upgrade_category_id");
ALTER TABLE "services" ADD CONSTRAINT "services_upgrade_requires_category" CHECK ("upgrade_category_id" IS NULL OR ("contracted_category_id" IS NOT NULL AND "upgrade_category_id" <> "contracted_category_id"));
