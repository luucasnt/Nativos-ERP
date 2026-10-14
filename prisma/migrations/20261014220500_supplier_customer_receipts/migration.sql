ALTER TABLE "direct_collections" ADD COLUMN "customer_amount" DECIMAL(12,2), ADD COLUMN "occurred_at" TIMESTAMP(3);
ALTER TABLE "direct_collections" ADD CONSTRAINT "direct_collections_customer_amount_positive" CHECK ("customer_amount" IS NULL OR "customer_amount" > 0);
