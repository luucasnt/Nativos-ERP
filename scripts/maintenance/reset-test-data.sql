-- ONE-TIME maintenance, explicitly authorized by Lucas on 2026-10-08.
-- Never part of application migrations, deploy builds, or a public endpoint.
-- Exact owner/project verified before execution. Financial/audit protection
-- triggers remain enabled: TRUNCATE is confined to this privileged operation.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.audit_logs WHERE action='dados_teste_removidos') THEN
    RAISE EXCEPTION 'One-time reset already executed; reset aborted';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id='c33ffb63-5a52-4155-9b14-1f0cf89713a4' AND email='lucas.ms16@gmail.com') THEN
    RAISE EXCEPTION 'Owner authentication account missing; reset aborted';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id='f545170b-93e2-4c40-9ff6-3787eac42e1c' AND auth_user_id='c33ffb63-5a52-4155-9b14-1f0cf89713a4' AND email='lucas.ms16@gmail.com' AND is_owner AND status='ativo') THEN
    RAISE EXCEPTION 'Owner identity does not match; reset aborted';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE id<>'c33ffb63-5a52-4155-9b14-1f0cf89713a4' AND coalesce(email,'') NOT LIKE '%.test') THEN
    RAISE EXCEPTION 'Unexpected real authentication account; reset aborted';
  END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS nativos_maintenance;
REVOKE ALL ON SCHEMA nativos_maintenance FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE IF NOT EXISTS nativos_maintenance.reset_snapshots (
  batch_id uuid NOT NULL, table_name text NOT NULL, saved_at timestamptz NOT NULL DEFAULT now(),
  row_count bigint NOT NULL, rows_data jsonb NOT NULL,
  PRIMARY KEY (batch_id, table_name)
);
ALTER TABLE nativos_maintenance.reset_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA nativos_maintenance FROM PUBLIC, anon, authenticated, service_role;
LOCK TABLE public.alerts, public.audit_logs, public.bank_accounts, public.billing_cycle_reservations, public.billing_cycles,
  public.cash_closings, public.change_requests, public.client_credits, public.clients, public.communications, public.companies,
  public.compensations, public.direct_collections, public.drivers, public.finance_entries, public.payments, public.portal_notifications,
  public.reservations, public.service_expenses, public.services, public.users, public.vehicle_expense_policies, public.vehicles
  IN ACCESS EXCLUSIVE MODE;
CREATE TEMP TABLE reset_batch ON COMMIT DROP AS SELECT gen_random_uuid() batch_id;
DO $$ DECLARE tbl text; batch uuid; BEGIN
  SELECT batch_id INTO batch FROM reset_batch;
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename LOOP
    EXECUTE format('INSERT INTO nativos_maintenance.reset_snapshots (batch_id,table_name,row_count,rows_data) SELECT $1,$2,count(*),coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) FROM public.%I t',tbl) USING batch,tbl;
  END LOOP;
END $$;
CREATE TEMP TABLE retained_owner ON COMMIT DROP AS SELECT * FROM public.users WHERE id='f545170b-93e2-4c40-9ff6-3787eac42e1c';
TRUNCATE TABLE public.alerts, public.audit_logs, public.bank_accounts, public.billing_cycle_reservations, public.billing_cycles,
  public.cash_closings, public.change_requests, public.client_credits, public.clients, public.communications, public.companies,
  public.compensations, public.direct_collections, public.drivers, public.finance_entries, public.payments, public.portal_notifications,
  public.reservations, public.service_expenses, public.services, public.users, public.vehicle_expense_policies, public.vehicles;
INSERT INTO public.users SELECT * FROM retained_owner;
UPDATE public.users SET linked_company_id=NULL, linked_driver_id=NULL WHERE id='f545170b-93e2-4c40-9ff6-3787eac42e1c';
DELETE FROM auth.sessions WHERE user_id<>'c33ffb63-5a52-4155-9b14-1f0cf89713a4';
DELETE FROM auth.users WHERE id<>'c33ffb63-5a52-4155-9b14-1f0cf89713a4';
-- One real maintenance audit replaces the fictitious operational audit.
INSERT INTO public.audit_logs (id,actor_id,action,entity_type,metadata,created_at)
SELECT gen_random_uuid(),'f545170b-93e2-4c40-9ff6-3787eac42e1c','dados_teste_removidos','other',
 jsonb_build_object('batch_id',batch_id,'authorization','Lucas solicitou zerar os dados de teste em 2026-10-08','preserved','owner access, settings, catalog, templates, clauses, commission defaults'),now() FROM reset_batch;
COMMIT;
SELECT jsonb_build_object('clients',(SELECT count(*) FROM public.clients),'companies',(SELECT count(*) FROM public.companies),
 'drivers',(SELECT count(*) FROM public.drivers),'vehicles',(SELECT count(*) FROM public.vehicles),'reservations',(SELECT count(*) FROM public.reservations),
 'services',(SELECT count(*) FROM public.services),'finance_entries',(SELECT count(*) FROM public.finance_entries),'payments',(SELECT count(*) FROM public.payments),
 'bank_accounts',(SELECT count(*) FROM public.bank_accounts),'communications',(SELECT count(*) FROM public.communications),
 'users',(SELECT count(*) FROM public.users),'auth_users',(SELECT count(*) FROM auth.users)) AS reset_result;
