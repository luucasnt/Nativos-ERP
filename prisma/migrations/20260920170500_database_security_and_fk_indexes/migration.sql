-- Harden helper/trigger functions against search_path injection.
ALTER FUNCTION public.app_current_user_id() SET search_path = '';
ALTER FUNCTION public.app_is_internal() SET search_path = '';
ALTER FUNCTION public.app_linked_company_id() SET search_path = '';
ALTER FUNCTION public.app_linked_driver_id() SET search_path = '';
ALTER FUNCTION public.prevent_audit_log_mutation() SET search_path = '';
ALTER FUNCTION public.prevent_financial_delete() SET search_path = '';

-- Expense policies are administrative configuration. Keep them unavailable
-- to anonymous and portal accounts while allowing internal authenticated users.
DROP POLICY IF EXISTS "internal_manage_vehicle_expense_policies" ON public.vehicle_expense_policies;
CREATE POLICY "internal_manage_vehicle_expense_policies"
ON public.vehicle_expense_policies
FOR ALL
TO authenticated
USING ((SELECT public.app_is_internal()))
WITH CHECK ((SELECT public.app_is_internal()));

-- Evaluate auth helpers once per statement instead of once per returned row.
DROP POLICY IF EXISTS "users_select_self_or_internal" ON public.users;
CREATE POLICY "users_select_self_or_internal"
ON public.users
FOR SELECT
TO authenticated
USING (
  "auth_user_id" = (SELECT auth.uid())
  OR (SELECT public.app_is_internal())
);

DROP POLICY IF EXISTS "catalog_items_select_authenticated" ON public.catalog_items;
CREATE POLICY "catalog_items_select_authenticated"
ON public.catalog_items
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

-- Cover every foreign key reported by the Supabase performance advisor.
CREATE INDEX IF NOT EXISTS "alerts_archived_by_id_idx" ON public.alerts ("archived_by_id");
CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_idx" ON public.audit_logs ("actor_id");
CREATE INDEX IF NOT EXISTS "billing_cycle_reservations_reservation_id_idx" ON public.billing_cycle_reservations ("reservation_id");
CREATE INDEX IF NOT EXISTS "cash_closings_bank_account_id_idx" ON public.cash_closings ("bank_account_id");
CREATE INDEX IF NOT EXISTS "cash_closings_performed_by_id_idx" ON public.cash_closings ("performed_by_id");
CREATE INDEX IF NOT EXISTS "cash_closings_reopened_by_id_idx" ON public.cash_closings ("reopened_by_id");
CREATE INDEX IF NOT EXISTS "change_requests_reviewed_by_id_idx" ON public.change_requests ("reviewed_by_id");
CREATE INDEX IF NOT EXISTS "client_credits_client_id_idx" ON public.client_credits ("client_id");
CREATE INDEX IF NOT EXISTS "clients_origin_partner_id_idx" ON public.clients ("origin_partner_id");
CREATE INDEX IF NOT EXISTS "communications_template_key_idx" ON public.communications ("template_key");
CREATE INDEX IF NOT EXISTS "companies_category_id_idx" ON public.companies ("category_id");
CREATE INDEX IF NOT EXISTS "companies_owner_driver_id_idx" ON public.companies ("owner_driver_id");
CREATE INDEX IF NOT EXISTS "compensations_reversed_by_id_idx" ON public.compensations ("reversed_by_id");
CREATE INDEX IF NOT EXISTS "direct_collections_not_received_reason_id_idx" ON public.direct_collections ("not_received_reason_id");
CREATE INDEX IF NOT EXISTS "direct_collections_reversed_by_id_idx" ON public.direct_collections ("reversed_by_id");
CREATE INDEX IF NOT EXISTS "direct_collections_service_id_idx" ON public.direct_collections ("service_id");
CREATE INDEX IF NOT EXISTS "drivers_reviewed_by_id_idx" ON public.drivers ("reviewed_by_id");
CREATE INDEX IF NOT EXISTS "drivers_supplier_id_idx" ON public.drivers ("supplier_id");
CREATE INDEX IF NOT EXISTS "finance_entries_compensacao_id_idx" ON public.finance_entries ("compensacao_id");
CREATE INDEX IF NOT EXISTS "finance_entries_estorno_of_id_idx" ON public.finance_entries ("estorno_of_id");
CREATE INDEX IF NOT EXISTS "finance_entries_reversed_by_id_idx" ON public.finance_entries ("reversed_by_id");
CREATE INDEX IF NOT EXISTS "payments_bank_account_id_idx" ON public.payments ("bank_account_id");
CREATE INDEX IF NOT EXISTS "payments_estorno_of_id_idx" ON public.payments ("estorno_of_id");
CREATE INDEX IF NOT EXISTS "payments_reconciled_by_id_idx" ON public.payments ("reconciled_by_id");
CREATE INDEX IF NOT EXISTS "payments_reversed_by_id_idx" ON public.payments ("reversed_by_id");
CREATE INDEX IF NOT EXISTS "service_expenses_category_id_idx" ON public.service_expenses ("category_id");
CREATE INDEX IF NOT EXISTS "service_expenses_reviewed_by_id_idx" ON public.service_expenses ("reviewed_by_id");
CREATE INDEX IF NOT EXISTS "services_pacote_disposicao_id_idx" ON public.services ("pacote_disposicao_id");
CREATE INDEX IF NOT EXISTS "users_linked_company_id_idx" ON public.users ("linked_company_id");
CREATE INDEX IF NOT EXISTS "vehicles_category_id_idx" ON public.vehicles ("category_id");
CREATE INDEX IF NOT EXISTS "vehicles_reviewed_by_id_idx" ON public.vehicles ("reviewed_by_id");
CREATE INDEX IF NOT EXISTS "vehicles_supplier_id_idx" ON public.vehicles ("supplier_id");
