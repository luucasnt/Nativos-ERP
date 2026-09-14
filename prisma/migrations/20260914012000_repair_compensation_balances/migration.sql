-- Corrige compensações históricas em que ambos os títulos foram marcados
-- como totalmente pagos, mesmo quando um deles tinha valor superior à
-- compensação. Pagamentos ativos também entram no cálculo do saldo.

UPDATE "public"."compensations"
SET
  "payable_allocation" = jsonb_set(
    "payable_allocation",
    '{amount}',
    to_jsonb("amount"::text),
    true
  ),
  "receivable_allocation" = jsonb_set(
    "receivable_allocation",
    '{amount}',
    to_jsonb("amount"::text),
    true
  )
WHERE "status" = 'confirmada'
  AND "reversed_at" IS NULL;

WITH recalculated AS (
  SELECT
    entry."id",
    (
      COALESCE((
        SELECT SUM(payment."amount")
        FROM "public"."payments" AS payment
        WHERE payment."finance_entry_id" = entry."id"
          AND payment."reversed_at" IS NULL
          AND payment."estorno_of_id" IS NULL
      ), 0) + LEAST(entry."amount", compensation."amount")
    ) >= entry."amount" AS "fully_settled"
  FROM "public"."finance_entries" AS entry
  INNER JOIN "public"."compensations" AS compensation
    ON compensation."id" = entry."compensacao_id"
  WHERE entry."reversed_at" IS NULL
    AND entry."status" <> 'cancelado'
    AND compensation."status" = 'confirmada'
    AND compensation."reversed_at" IS NULL
)
UPDATE "public"."finance_entries" AS entry
SET
  "status" = CASE
    WHEN recalculated."fully_settled" THEN 'pago'::"FinanceEntryStatus"
    ELSE 'pendente'::"FinanceEntryStatus"
  END,
  "payment_eligible" = NOT recalculated."fully_settled",
  "updated_at" = CURRENT_TIMESTAMP
FROM recalculated
WHERE entry."id" = recalculated."id";
