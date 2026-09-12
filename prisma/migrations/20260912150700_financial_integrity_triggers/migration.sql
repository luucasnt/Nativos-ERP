-- Regra de banco não-negociável (spec seção 6):
-- Nenhuma automação ou usuário — nem mesmo um usuário com privilégio
-- máximo (is_owner) — pode fazer DELETE físico em finance_entries,
-- payments, compensations ou direct_collections. Toda reversão é um novo
-- registro de estorno (estorno_of_id / reversed_at / reversed_by_id /
-- reversal_reason), nunca uma remoção.
--
-- Implementado como trigger de banco (BEFORE DELETE que lança exceção),
-- não apenas validação de aplicação — para que nem SQL direto consiga
-- contornar a regra.

CREATE OR REPLACE FUNCTION prevent_financial_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'DELETE físico não é permitido na tabela "%". Toda reversão financeira deve ser registrada como um novo lançamento de estorno (estorno_of_id / reversed_at / reversed_by_id / reversal_reason).',
    TG_TABLE_NAME
    USING ERRCODE = '23000';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_delete_finance_entries
  BEFORE DELETE ON "finance_entries"
  FOR EACH ROW EXECUTE FUNCTION prevent_financial_delete();

CREATE TRIGGER trg_prevent_delete_payments
  BEFORE DELETE ON "payments"
  FOR EACH ROW EXECUTE FUNCTION prevent_financial_delete();

CREATE TRIGGER trg_prevent_delete_compensations
  BEFORE DELETE ON "compensations"
  FOR EACH ROW EXECUTE FUNCTION prevent_financial_delete();

CREATE TRIGGER trg_prevent_delete_direct_collections
  BEFORE DELETE ON "direct_collections"
  FOR EACH ROW EXECUTE FUNCTION prevent_financial_delete();

-- Log de auditoria append-only (spec seção 7):
-- audit_logs não pode sofrer UPDATE nem DELETE físico, apenas INSERT —
-- nem por um usuário com privilégio máximo.

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'A tabela "audit_logs" é append-only: UPDATE e DELETE físico não são permitidos.'
    USING ERRCODE = '23000';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_update_audit_logs
  BEFORE UPDATE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER trg_prevent_delete_audit_logs
  BEFORE DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
