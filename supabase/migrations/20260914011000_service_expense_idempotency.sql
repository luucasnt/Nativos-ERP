alter table public.service_expenses
  add column if not exists dedupe_key text;

create unique index if not exists service_expenses_dedupe_key_key
  on public.service_expenses (dedupe_key);
