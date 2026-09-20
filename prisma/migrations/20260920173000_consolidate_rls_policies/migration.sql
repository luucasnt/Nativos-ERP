BEGIN;

-- Replace overlapping permissive policies with one policy per table/action.
-- The combined expressions preserve PostgreSQL's previous OR semantics while
-- limiting every portal policy to authenticated sessions.
DROP POLICY IF EXISTS "billing_cycle_reservations_all_internal" ON public.billing_cycle_reservations;
DROP POLICY IF EXISTS "billing_cycle_reservations_select_portal_company" ON public.billing_cycle_reservations;
DROP POLICY IF EXISTS "billing_cycles_all_internal" ON public.billing_cycles;
DROP POLICY IF EXISTS "billing_cycles_select_portal_company" ON public.billing_cycles;
DROP POLICY IF EXISTS "change_requests_all_internal" ON public.change_requests;
DROP POLICY IF EXISTS "change_requests_insert_portal" ON public.change_requests;
DROP POLICY IF EXISTS "change_requests_select_portal" ON public.change_requests;
DROP POLICY IF EXISTS "clients_all_internal" ON public.clients;
DROP POLICY IF EXISTS "clients_select_portal_company" ON public.clients;
DROP POLICY IF EXISTS "clients_select_portal_driver" ON public.clients;
DROP POLICY IF EXISTS "companies_all_internal" ON public.companies;
DROP POLICY IF EXISTS "companies_select_self" ON public.companies;
DROP POLICY IF EXISTS "compensations_all_internal" ON public.compensations;
DROP POLICY IF EXISTS "compensations_select_portal" ON public.compensations;
DROP POLICY IF EXISTS "direct_collections_all_internal" ON public.direct_collections;
DROP POLICY IF EXISTS "direct_collections_select_portal" ON public.direct_collections;
DROP POLICY IF EXISTS "drivers_all_internal" ON public.drivers;
DROP POLICY IF EXISTS "drivers_insert_portal_supplier" ON public.drivers;
DROP POLICY IF EXISTS "drivers_select_portal_supplier" ON public.drivers;
DROP POLICY IF EXISTS "drivers_select_self" ON public.drivers;
DROP POLICY IF EXISTS "finance_entries_all_internal" ON public.finance_entries;
DROP POLICY IF EXISTS "finance_entries_select_portal_company" ON public.finance_entries;
DROP POLICY IF EXISTS "finance_entries_select_portal_driver" ON public.finance_entries;
DROP POLICY IF EXISTS "payments_all_internal" ON public.payments;
DROP POLICY IF EXISTS "payments_select_portal" ON public.payments;
DROP POLICY IF EXISTS "portal_notifications_all_internal" ON public.portal_notifications;
DROP POLICY IF EXISTS "portal_notifications_select_self" ON public.portal_notifications;
DROP POLICY IF EXISTS "portal_notifications_update_self" ON public.portal_notifications;
DROP POLICY IF EXISTS "reservations_all_internal" ON public.reservations;
DROP POLICY IF EXISTS "reservations_select_portal_company" ON public.reservations;
DROP POLICY IF EXISTS "reservations_select_portal_driver" ON public.reservations;
DROP POLICY IF EXISTS "service_expenses_all_internal" ON public.service_expenses;
DROP POLICY IF EXISTS "service_expenses_insert_portal_driver" ON public.service_expenses;
DROP POLICY IF EXISTS "service_expenses_select_portal_driver" ON public.service_expenses;
DROP POLICY IF EXISTS "service_expenses_select_portal_supplier" ON public.service_expenses;
DROP POLICY IF EXISTS "services_all_internal" ON public.services;
DROP POLICY IF EXISTS "services_select_portal_driver" ON public.services;
DROP POLICY IF EXISTS "services_select_portal_supplier" ON public.services;
DROP POLICY IF EXISTS "users_all_internal" ON public.users;
DROP POLICY IF EXISTS "vehicles_all_internal" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_insert_portal_supplier" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_select_portal_supplier" ON public.vehicles;

-- Allow safe re-execution when the production database was validated before
-- Prisma records this migration in its history.
DROP POLICY IF EXISTS "billing_cycle_reservations_select_access" ON public.billing_cycle_reservations;
DROP POLICY IF EXISTS "billing_cycles_select_access" ON public.billing_cycles;
DROP POLICY IF EXISTS "change_requests_select_access" ON public.change_requests;
DROP POLICY IF EXISTS "change_requests_insert_access" ON public.change_requests;
DROP POLICY IF EXISTS "clients_select_access" ON public.clients;
DROP POLICY IF EXISTS "companies_select_access" ON public.companies;
DROP POLICY IF EXISTS "compensations_select_access" ON public.compensations;
DROP POLICY IF EXISTS "direct_collections_select_access" ON public.direct_collections;
DROP POLICY IF EXISTS "drivers_select_access" ON public.drivers;
DROP POLICY IF EXISTS "drivers_insert_access" ON public.drivers;
DROP POLICY IF EXISTS "finance_entries_select_access" ON public.finance_entries;
DROP POLICY IF EXISTS "payments_select_access" ON public.payments;
DROP POLICY IF EXISTS "portal_notifications_select_access" ON public.portal_notifications;
DROP POLICY IF EXISTS "portal_notifications_update_access" ON public.portal_notifications;
DROP POLICY IF EXISTS "reservations_select_access" ON public.reservations;
DROP POLICY IF EXISTS "service_expenses_select_access" ON public.service_expenses;
DROP POLICY IF EXISTS "service_expenses_insert_access" ON public.service_expenses;
DROP POLICY IF EXISTS "services_select_access" ON public.services;
DROP POLICY IF EXISTS "vehicles_select_access" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_insert_access" ON public.vehicles;

-- Internal write permissions are split by command to avoid an ALL policy
-- overlapping portal-specific INSERT or UPDATE policies.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'billing_cycle_reservations','billing_cycles','change_requests','clients',
    'companies','compensations','direct_collections','drivers','finance_entries',
    'payments','portal_notifications','reservations','service_expenses','services',
    'users','vehicles'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_insert_internal', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_update_internal', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_delete_internal', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT public.app_is_internal()))',
      table_name || '_insert_internal', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT public.app_is_internal())) WITH CHECK ((SELECT public.app_is_internal()))',
      table_name || '_update_internal', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT public.app_is_internal()))',
      table_name || '_delete_internal', table_name
    );
  END LOOP;
END
$$;

CREATE POLICY "billing_cycle_reservations_select_access"
ON public.billing_cycle_reservations FOR SELECT TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR EXISTS (
    SELECT 1 FROM public.billing_cycles bc
    WHERE bc.id = billing_cycle_id
      AND bc.company_id = (SELECT public.app_linked_company_id())
  )
);

CREATE POLICY "billing_cycles_select_access"
ON public.billing_cycles FOR SELECT TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR company_id = (SELECT public.app_linked_company_id())
);

CREATE POLICY "change_requests_select_access"
ON public.change_requests FOR SELECT TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR (requester_type = 'company'::"ChangeRequestRequesterType"
      AND requester_id = (SELECT public.app_linked_company_id()))
  OR (requester_type = 'driver'::"ChangeRequestRequesterType"
      AND requester_id = (SELECT public.app_linked_driver_id()))
);

CREATE POLICY "clients_select_access"
ON public.clients FOR SELECT TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR origin_partner_id = (SELECT public.app_linked_company_id())
  OR EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.client_id = clients.id
      AND (
        r.origin_partner_id = (SELECT public.app_linked_company_id())
        OR EXISTS (
          SELECT 1 FROM public.services s
          WHERE s.reservation_id = r.id
            AND s.supplier_id = (SELECT public.app_linked_company_id())
        )
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.reservations r
    JOIN public.services s ON s.reservation_id = r.id
    WHERE r.client_id = clients.id
      AND s.driver_id = (SELECT public.app_linked_driver_id())
  )
);

CREATE POLICY "companies_select_access"
ON public.companies FOR SELECT TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR id = (SELECT public.app_linked_company_id())
);

CREATE POLICY "compensations_select_access"
ON public.compensations FOR SELECT TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR counterparty_id = ANY (ARRAY[
    (SELECT public.app_linked_company_id()),
    (SELECT public.app_linked_driver_id())
  ])
);

CREATE POLICY "direct_collections_select_access"
ON public.direct_collections FOR SELECT TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR receiver_id = ANY (ARRAY[
    (SELECT public.app_linked_company_id()),
    (SELECT public.app_linked_driver_id())
  ])
  OR financial_responsible_id = ANY (ARRAY[
    (SELECT public.app_linked_company_id()),
    (SELECT public.app_linked_driver_id())
  ])
);

CREATE POLICY "drivers_select_access"
ON public.drivers FOR SELECT TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR supplier_id = (SELECT public.app_linked_company_id())
  OR id = (SELECT public.app_linked_driver_id())
);

CREATE POLICY "finance_entries_select_access"
ON public.finance_entries FOR SELECT TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR (party_type IN ('fornecedor'::"FinancePartyType", 'parceiro'::"FinancePartyType")
      AND party_id = (SELECT public.app_linked_company_id()))
  OR (party_type = 'motorista'::"FinancePartyType"
      AND party_id = (SELECT public.app_linked_driver_id()))
);

CREATE POLICY "payments_select_access"
ON public.payments FOR SELECT TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR EXISTS (
    SELECT 1 FROM public.finance_entries fe
    WHERE fe.id = payments.finance_entry_id
      AND (
        (fe.party_type IN ('fornecedor'::"FinancePartyType", 'parceiro'::"FinancePartyType")
         AND fe.party_id = (SELECT public.app_linked_company_id()))
        OR (fe.party_type = 'motorista'::"FinancePartyType"
            AND fe.party_id = (SELECT public.app_linked_driver_id()))
      )
  )
);

CREATE POLICY "portal_notifications_select_access"
ON public.portal_notifications FOR SELECT TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR user_id = (SELECT public.app_current_user_id())
);

CREATE POLICY "reservations_select_access"
ON public.reservations FOR SELECT TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR origin_partner_id = (SELECT public.app_linked_company_id())
  OR EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.reservation_id = reservations.id
      AND s.supplier_id = (SELECT public.app_linked_company_id())
  )
  OR EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.reservation_id = reservations.id
      AND s.driver_id = (SELECT public.app_linked_driver_id())
  )
);

CREATE POLICY "service_expenses_select_access"
ON public.service_expenses FOR SELECT TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR driver_id = (SELECT public.app_linked_driver_id())
  OR EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = service_expenses.driver_id
      AND d.supplier_id = (SELECT public.app_linked_company_id())
  )
);

CREATE POLICY "services_select_access"
ON public.services FOR SELECT TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR driver_id = (SELECT public.app_linked_driver_id())
  OR supplier_id = (SELECT public.app_linked_company_id())
);

CREATE POLICY "vehicles_select_access"
ON public.vehicles FOR SELECT TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR supplier_id = (SELECT public.app_linked_company_id())
);

-- users_select_self_or_internal already contains internal + self SELECT.

DROP POLICY "change_requests_insert_internal" ON public.change_requests;
CREATE POLICY "change_requests_insert_access"
ON public.change_requests FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.app_is_internal())
  OR (
    status = 'solicitada'::"ChangeRequestStatus"
    AND (
      (requester_type = 'company'::"ChangeRequestRequesterType"
       AND requester_id = (SELECT public.app_linked_company_id()))
      OR (requester_type = 'driver'::"ChangeRequestRequesterType"
          AND requester_id = (SELECT public.app_linked_driver_id()))
    )
  )
);

DROP POLICY "drivers_insert_internal" ON public.drivers;
CREATE POLICY "drivers_insert_access"
ON public.drivers FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.app_is_internal())
  OR (supplier_id = (SELECT public.app_linked_company_id())
      AND approval_status = 'pendente'::"ApprovalStatus"
      AND created_from_portal = true)
);

DROP POLICY "service_expenses_insert_internal" ON public.service_expenses;
CREATE POLICY "service_expenses_insert_access"
ON public.service_expenses FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.app_is_internal())
  OR (driver_id = (SELECT public.app_linked_driver_id())
      AND status = 'pendente'::"ServiceExpenseStatus")
);

DROP POLICY "vehicles_insert_internal" ON public.vehicles;
CREATE POLICY "vehicles_insert_access"
ON public.vehicles FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.app_is_internal())
  OR (supplier_id = (SELECT public.app_linked_company_id())
      AND approval_status = 'pendente'::"ApprovalStatus"
      AND created_from_portal = true)
);

DROP POLICY "portal_notifications_update_internal" ON public.portal_notifications;
CREATE POLICY "portal_notifications_update_access"
ON public.portal_notifications FOR UPDATE TO authenticated
USING (
  (SELECT public.app_is_internal())
  OR user_id = (SELECT public.app_current_user_id())
)
WITH CHECK (
  (SELECT public.app_is_internal())
  OR user_id = (SELECT public.app_current_user_id())
);

-- Abort the whole migration if any protected operation is missing, duplicated,
-- exposed to PUBLIC, or attached to a table without RLS enabled.
DO $$
DECLARE
  affected_tables text[] := ARRAY[
    'billing_cycle_reservations','billing_cycles','change_requests','clients',
    'companies','compensations','direct_collections','drivers','finance_entries',
    'payments','portal_notifications','reservations','service_expenses','services',
    'users','vehicles'
  ];
  duplicate_count integer;
  missing_count integer;
  public_count integer;
  rls_disabled_count integer;
BEGIN
  WITH expanded AS (
    SELECT tablename,
           unnest(CASE WHEN cmd = 'ALL'
             THEN ARRAY['SELECT','INSERT','UPDATE','DELETE']
             ELSE ARRAY[cmd]
           END) AS effective_cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND permissive = 'PERMISSIVE'
      AND tablename = ANY (affected_tables)
      AND 'authenticated' = ANY (roles)
  )
  SELECT count(*) INTO duplicate_count
  FROM (
    SELECT tablename, effective_cmd
    FROM expanded
    GROUP BY tablename, effective_cmd
    HAVING count(*) > 1
  ) duplicated;

  WITH required AS (
    SELECT table_name, command
    FROM unnest(affected_tables) AS table_name
    CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) AS command
  )
  SELECT count(*) INTO missing_count
  FROM required r
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = r.table_name
      AND p.permissive = 'PERMISSIVE'
      AND 'authenticated' = ANY (p.roles)
      AND (p.cmd = r.command OR p.cmd = 'ALL')
  );

  SELECT count(*) INTO public_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = ANY (affected_tables)
    AND 'public' = ANY (roles);

  SELECT count(*) INTO rls_disabled_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = ANY (affected_tables)
    AND NOT c.relrowsecurity;

  IF duplicate_count <> 0 OR missing_count <> 0
     OR public_count <> 0 OR rls_disabled_count <> 0 THEN
    RAISE EXCEPTION
      'RLS validation failed: duplicate=%, missing=%, public=%, rls_disabled=%',
      duplicate_count, missing_count, public_count, rls_disabled_count;
  END IF;
END
$$;

COMMIT;
