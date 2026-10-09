-- Data efetiva separada da data de cadastro. Null mantém compatibilidade
-- com registros antigos e integrações que usam created_at como fallback.
ALTER TABLE "payments" ADD COLUMN "occurred_at" TIMESTAMP(3);
CREATE INDEX "payments_bank_account_id_occurred_at_idx" ON "payments"("bank_account_id", "occurred_at");
