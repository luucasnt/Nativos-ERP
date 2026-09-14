-- Espelho da migração Prisma: restaura saldos residuais de compensações
-- parciais e normaliza o valor registrado nas duas alocações.

update public.compensations
set
  payable_allocation = jsonb_set(payable_allocation, '{amount}', to_jsonb(amount::text), true),
  receivable_allocation = jsonb_set(receivable_allocation, '{amount}', to_jsonb(amount::text), true)
where status = 'confirmada'
  and reversed_at is null;

with recalculated as (
  select
    entry.id,
    (
      coalesce((
        select sum(payment.amount)
        from public.payments as payment
        where payment.finance_entry_id = entry.id
          and payment.reversed_at is null
          and payment.estorno_of_id is null
      ), 0) + least(entry.amount, compensation.amount)
    ) >= entry.amount as fully_settled
  from public.finance_entries as entry
  inner join public.compensations as compensation on compensation.id = entry.compensacao_id
  where entry.reversed_at is null
    and entry.status <> 'cancelado'
    and compensation.status = 'confirmada'
    and compensation.reversed_at is null
)
update public.finance_entries as entry
set
  status = case
    when recalculated.fully_settled then 'pago'::"FinanceEntryStatus"
    else 'pendente'::"FinanceEntryStatus"
  end,
  payment_eligible = not recalculated.fully_settled,
  updated_at = current_timestamp
from recalculated
where entry.id = recalculated.id;
