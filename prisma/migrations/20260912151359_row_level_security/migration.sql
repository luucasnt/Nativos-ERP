-- Row Level Security (spec seção 3/7: 4 frentes de acesso, cada uma só
-- enxerga o que lhe compete).
--
-- Contexto de arquitetura: o backend Next.js (Server Components/Actions)
-- fala com o Postgres através do Prisma usando uma role de conexão
-- privilegiada (dona das tabelas) — no Postgres, RLS é automaticamente
-- ignorado pelo dono da tabela/roles com BYPASSRLS, então essas políticas
-- não afetam esse caminho de acesso (toda autorização fina desse caminho
-- é feita em código de servidor, com o Prisma `User` como fonte da
-- verdade). O que estas políticas protegem é qualquer acesso direto via
-- Supabase (PostgREST/GraphQL/Realtime ou supabase-js no navegador), que o
-- Supabase expõe por padrão para toda tabela do schema public — sem RLS,
-- essas tabelas ficariam publicamente acessíveis via API.
--
-- `auth.uid()` / `auth.jwt()` são fornecidas pelo próprio Supabase (schema
-- `auth`, populado a partir do JWT da sessão) — não são redefinidas aqui.
-- app_metadata do JWT é mantida em sincronia com `users` por
-- src/lib/auth/provision-user.ts (syncAppMetadata).

create or replace function app_current_user_id() returns uuid
language sql stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'user_id', '')::uuid;
$$;

create or replace function app_is_internal() returns boolean
language sql stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'account_type') = 'internal', false);
$$;

create or replace function app_linked_company_id() returns uuid
language sql stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'linked_company_id', '')::uuid;
$$;

create or replace function app_linked_driver_id() returns uuid
language sql stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'linked_driver_id', '')::uuid;
$$;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
alter table "users" enable row level security;
alter table "users" force row level security;

create policy "users_select_self_or_internal" on "users"
  for select using (auth_user_id = auth.uid() or app_is_internal());

create policy "users_all_internal" on "users"
  for all using (app_is_internal()) with check (app_is_internal());

-- ---------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------
alter table "clients" enable row level security;
alter table "clients" force row level security;

create policy "clients_all_internal" on "clients"
  for all using (app_is_internal()) with check (app_is_internal());

create policy "clients_select_portal_company" on "clients"
  for select using (
    origin_partner_id = app_linked_company_id()
    or exists (
      select 1 from "reservations" r
      where r.client_id = clients.id
        and (
          r.origin_partner_id = app_linked_company_id()
          or exists (
            select 1 from "services" s
            where s.reservation_id = r.id and s.supplier_id = app_linked_company_id()
          )
        )
    )
  );

create policy "clients_select_portal_driver" on "clients"
  for select using (
    exists (
      select 1 from "reservations" r
      join "services" s on s.reservation_id = r.id
      where r.client_id = clients.id and s.driver_id = app_linked_driver_id()
    )
  );

-- ---------------------------------------------------------------------
-- drivers
-- ---------------------------------------------------------------------
alter table "drivers" enable row level security;
alter table "drivers" force row level security;

create policy "drivers_all_internal" on "drivers"
  for all using (app_is_internal()) with check (app_is_internal());

create policy "drivers_select_self" on "drivers"
  for select using (id = app_linked_driver_id());

create policy "drivers_select_portal_supplier" on "drivers"
  for select using (supplier_id = app_linked_company_id());

-- Cadastro de motorista pelo próprio fornecedor via portal (pendente de
-- aprovação do admin) — spec seção 4.
create policy "drivers_insert_portal_supplier" on "drivers"
  for insert with check (
    supplier_id = app_linked_company_id()
    and approval_status = 'pendente'
    and created_from_portal = true
  );

-- ---------------------------------------------------------------------
-- vehicles
-- ---------------------------------------------------------------------
alter table "vehicles" enable row level security;
alter table "vehicles" force row level security;

create policy "vehicles_all_internal" on "vehicles"
  for all using (app_is_internal()) with check (app_is_internal());

create policy "vehicles_select_portal_supplier" on "vehicles"
  for select using (supplier_id = app_linked_company_id());

create policy "vehicles_insert_portal_supplier" on "vehicles"
  for insert with check (
    supplier_id = app_linked_company_id()
    and approval_status = 'pendente'
    and created_from_portal = true
  );

-- ---------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------
alter table "companies" enable row level security;
alter table "companies" force row level security;

create policy "companies_all_internal" on "companies"
  for all using (app_is_internal()) with check (app_is_internal());

create policy "companies_select_self" on "companies"
  for select using (id = app_linked_company_id());

-- ---------------------------------------------------------------------
-- catalog_items — taxonomia de referência, leitura liberada para qualquer
-- usuário autenticado (necessária para portais renderizarem rótulos),
-- escrita só internamente.
-- ---------------------------------------------------------------------
alter table "catalog_items" enable row level security;
alter table "catalog_items" force row level security;

create policy "catalog_items_select_authenticated" on "catalog_items"
  for select using (auth.uid() is not null);

create policy "catalog_items_write_internal" on "catalog_items"
  for insert with check (app_is_internal());

create policy "catalog_items_update_internal" on "catalog_items"
  for update using (app_is_internal()) with check (app_is_internal());

create policy "catalog_items_delete_internal" on "catalog_items"
  for delete using (app_is_internal());

-- ---------------------------------------------------------------------
-- reservations
-- ---------------------------------------------------------------------
alter table "reservations" enable row level security;
alter table "reservations" force row level security;

create policy "reservations_all_internal" on "reservations"
  for all using (app_is_internal()) with check (app_is_internal());

create policy "reservations_select_portal_company" on "reservations"
  for select using (
    origin_partner_id = app_linked_company_id()
    or exists (
      select 1 from "services" s
      where s.reservation_id = reservations.id and s.supplier_id = app_linked_company_id()
    )
  );

create policy "reservations_select_portal_driver" on "reservations"
  for select using (
    exists (
      select 1 from "services" s
      where s.reservation_id = reservations.id and s.driver_id = app_linked_driver_id()
    )
  );

-- ---------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------
alter table "services" enable row level security;
alter table "services" force row level security;

create policy "services_all_internal" on "services"
  for all using (app_is_internal()) with check (app_is_internal());

create policy "services_select_portal_supplier" on "services"
  for select using (supplier_id = app_linked_company_id());

create policy "services_select_portal_driver" on "services"
  for select using (driver_id = app_linked_driver_id());

-- Nota: o fluxo de aceite do fornecedor (aguardando_aceite -> aceito /
-- recusado) é uma escrita de portal sobre uma linha já visível a ele, mas
-- fica de fora do RLS de UPDATE por ora — RLS é por linha, não por coluna,
-- e não queremos abrir a linha inteira (preço, custo, etc.) para escrita
-- de portal. Será exposto via uma rota/Server Action dedicada (com
-- validação explícita de quais campos podem mudar) na Fase 3/5.

-- ---------------------------------------------------------------------
-- finance_entries / payments / direct_collections / compensations
-- (leitura restrita por contraparte; escrita 100% interna — além da
-- proteção de DELETE por trigger, ver migração financial_integrity_triggers)
-- ---------------------------------------------------------------------
alter table "finance_entries" enable row level security;
alter table "finance_entries" force row level security;

create policy "finance_entries_all_internal" on "finance_entries"
  for all using (app_is_internal()) with check (app_is_internal());

create policy "finance_entries_select_portal_company" on "finance_entries"
  for select using (
    party_type in ('fornecedor', 'parceiro') and party_id = app_linked_company_id()
  );

create policy "finance_entries_select_portal_driver" on "finance_entries"
  for select using (party_type = 'motorista' and party_id = app_linked_driver_id());

alter table "payments" enable row level security;
alter table "payments" force row level security;

create policy "payments_all_internal" on "payments"
  for all using (app_is_internal()) with check (app_is_internal());

create policy "payments_select_portal" on "payments"
  for select using (
    exists (
      select 1 from "finance_entries" fe
      where fe.id = payments.finance_entry_id
        and (
          (fe.party_type in ('fornecedor', 'parceiro') and fe.party_id = app_linked_company_id())
          or (fe.party_type = 'motorista' and fe.party_id = app_linked_driver_id())
        )
    )
  );

alter table "direct_collections" enable row level security;
alter table "direct_collections" force row level security;

create policy "direct_collections_all_internal" on "direct_collections"
  for all using (app_is_internal()) with check (app_is_internal());

create policy "direct_collections_select_portal" on "direct_collections"
  for select using (
    receiver_id in (app_linked_company_id(), app_linked_driver_id())
    or financial_responsible_id in (app_linked_company_id(), app_linked_driver_id())
  );

alter table "compensations" enable row level security;
alter table "compensations" force row level security;

create policy "compensations_all_internal" on "compensations"
  for all using (app_is_internal()) with check (app_is_internal());

create policy "compensations_select_portal" on "compensations"
  for select using (counterparty_id in (app_linked_company_id(), app_linked_driver_id()));

-- ---------------------------------------------------------------------
-- billing_cycles / billing_cycle_reservations
-- ---------------------------------------------------------------------
alter table "billing_cycles" enable row level security;
alter table "billing_cycles" force row level security;

create policy "billing_cycles_all_internal" on "billing_cycles"
  for all using (app_is_internal()) with check (app_is_internal());

create policy "billing_cycles_select_portal_company" on "billing_cycles"
  for select using (company_id = app_linked_company_id());

alter table "billing_cycle_reservations" enable row level security;
alter table "billing_cycle_reservations" force row level security;

create policy "billing_cycle_reservations_all_internal" on "billing_cycle_reservations"
  for all using (app_is_internal()) with check (app_is_internal());

create policy "billing_cycle_reservations_select_portal_company" on "billing_cycle_reservations"
  for select using (
    exists (
      select 1 from "billing_cycles" bc
      where bc.id = billing_cycle_reservations.billing_cycle_id
        and bc.company_id = app_linked_company_id()
    )
  );

-- ---------------------------------------------------------------------
-- cash_closings / bank_accounts / client_credits / contract_clauses /
-- email_templates / communications / settings — internos, sem acesso de
-- portal (não mencionados como visíveis a parceiro/fornecedor/motorista).
-- ---------------------------------------------------------------------
alter table "cash_closings" enable row level security;
alter table "cash_closings" force row level security;
create policy "cash_closings_all_internal" on "cash_closings"
  for all using (app_is_internal()) with check (app_is_internal());

alter table "bank_accounts" enable row level security;
alter table "bank_accounts" force row level security;
create policy "bank_accounts_all_internal" on "bank_accounts"
  for all using (app_is_internal()) with check (app_is_internal());

alter table "client_credits" enable row level security;
alter table "client_credits" force row level security;
create policy "client_credits_all_internal" on "client_credits"
  for all using (app_is_internal()) with check (app_is_internal());

alter table "contract_clauses" enable row level security;
alter table "contract_clauses" force row level security;
create policy "contract_clauses_all_internal" on "contract_clauses"
  for all using (app_is_internal()) with check (app_is_internal());

alter table "email_templates" enable row level security;
alter table "email_templates" force row level security;
create policy "email_templates_all_internal" on "email_templates"
  for all using (app_is_internal()) with check (app_is_internal());

alter table "communications" enable row level security;
alter table "communications" force row level security;
create policy "communications_all_internal" on "communications"
  for all using (app_is_internal()) with check (app_is_internal());

alter table "settings" enable row level security;
alter table "settings" force row level security;
create policy "settings_all_internal" on "settings"
  for all using (app_is_internal()) with check (app_is_internal());

-- ---------------------------------------------------------------------
-- change_requests — canal de entrada de toda solicitação vinda de portal
-- externo (spec seção 7).
-- ---------------------------------------------------------------------
alter table "change_requests" enable row level security;
alter table "change_requests" force row level security;

create policy "change_requests_all_internal" on "change_requests"
  for all using (app_is_internal()) with check (app_is_internal());

create policy "change_requests_select_portal" on "change_requests"
  for select using (
    (requester_type = 'company' and requester_id = app_linked_company_id())
    or (requester_type = 'driver' and requester_id = app_linked_driver_id())
  );

create policy "change_requests_insert_portal" on "change_requests"
  for insert with check (
    status = 'solicitada'
    and (
      (requester_type = 'company' and requester_id = app_linked_company_id())
      or (requester_type = 'driver' and requester_id = app_linked_driver_id())
    )
  );

-- ---------------------------------------------------------------------
-- alerts / audit_logs — exclusivamente internos.
-- ---------------------------------------------------------------------
alter table "alerts" enable row level security;
alter table "alerts" force row level security;
create policy "alerts_all_internal" on "alerts"
  for all using (app_is_internal()) with check (app_is_internal());

alter table "audit_logs" enable row level security;
alter table "audit_logs" force row level security;
create policy "audit_logs_select_internal" on "audit_logs"
  for select using (app_is_internal());
create policy "audit_logs_insert_internal" on "audit_logs"
  for insert with check (app_is_internal());
-- (sem policy de update/delete: além de bloqueadas pelo trigger de
-- append-only, ficam também sem política de RLS = negadas por padrão.)

-- ---------------------------------------------------------------------
-- service_expenses — motorista registra e vê as próprias despesas;
-- fornecedor visualiza as despesas dos motoristas que fornece.
-- ---------------------------------------------------------------------
alter table "service_expenses" enable row level security;
alter table "service_expenses" force row level security;

create policy "service_expenses_all_internal" on "service_expenses"
  for all using (app_is_internal()) with check (app_is_internal());

create policy "service_expenses_select_portal_driver" on "service_expenses"
  for select using (driver_id = app_linked_driver_id());

create policy "service_expenses_insert_portal_driver" on "service_expenses"
  for insert with check (driver_id = app_linked_driver_id() and status = 'pendente');

create policy "service_expenses_select_portal_supplier" on "service_expenses"
  for select using (
    exists (
      select 1 from "drivers" d
      where d.id = service_expenses.driver_id and d.supplier_id = app_linked_company_id()
    )
  );

-- ---------------------------------------------------------------------
-- portal_notifications — cada usuário só vê (e marca como lida) a própria
-- notificação.
-- ---------------------------------------------------------------------
alter table "portal_notifications" enable row level security;
alter table "portal_notifications" force row level security;

create policy "portal_notifications_all_internal" on "portal_notifications"
  for all using (app_is_internal()) with check (app_is_internal());

create policy "portal_notifications_select_self" on "portal_notifications"
  for select using (user_id = app_current_user_id());

create policy "portal_notifications_update_self" on "portal_notifications"
  for update using (user_id = app_current_user_id())
  with check (user_id = app_current_user_id());
