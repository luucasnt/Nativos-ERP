-- Índices das consultas críticas do ERP. Todos usam IF NOT EXISTS para
-- permitir implantação segura em bancos que já receberam parte dos índices.
CREATE INDEX IF NOT EXISTS "reservations_status_created_at_idx"
  ON "public"."reservations" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "reservations_client_id_idx"
  ON "public"."reservations" ("client_id");
CREATE INDEX IF NOT EXISTS "reservations_origin_partner_id_idx"
  ON "public"."reservations" ("origin_partner_id");

CREATE INDEX IF NOT EXISTS "services_reservation_id_created_at_idx"
  ON "public"."services" ("reservation_id", "created_at");
CREATE INDEX IF NOT EXISTS "services_schedule_execution_idx"
  ON "public"."services" ("scheduled_date", "execution_status", "scheduled_time");
CREATE INDEX IF NOT EXISTS "services_supplier_acceptance_execution_idx"
  ON "public"."services" ("supplier_id", "acceptance_status", "execution_status");
CREATE INDEX IF NOT EXISTS "services_driver_execution_date_idx"
  ON "public"."services" ("driver_id", "execution_status", "scheduled_date");
CREATE INDEX IF NOT EXISTS "services_vehicle_execution_date_idx"
  ON "public"."services" ("vehicle_id", "execution_status", "scheduled_date");

CREATE INDEX IF NOT EXISTS "finance_entries_created_at_idx"
  ON "public"."finance_entries" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "finance_entries_type_status_created_at_idx"
  ON "public"."finance_entries" ("type", "status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "finance_entries_status_due_date_idx"
  ON "public"."finance_entries" ("status", "due_date");
CREATE INDEX IF NOT EXISTS "finance_entries_party_created_at_idx"
  ON "public"."finance_entries" ("party_type", "party_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "finance_entries_service_status_idx"
  ON "public"."finance_entries" ("service_id", "status");
CREATE INDEX IF NOT EXISTS "finance_entries_reservation_id_idx"
  ON "public"."finance_entries" ("reservation_id");

CREATE INDEX IF NOT EXISTS "payments_entry_active_created_at_idx"
  ON "public"."payments" ("finance_entry_id", "reversed_at", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "change_requests_status_created_at_idx"
  ON "public"."change_requests" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "change_requests_requester_status_idx"
  ON "public"."change_requests" ("requester_type", "requester_id", "status");
CREATE INDEX IF NOT EXISTS "change_requests_company_id_idx"
  ON "public"."change_requests" ("company_id");
CREATE INDEX IF NOT EXISTS "change_requests_reservation_id_idx"
  ON "public"."change_requests" ("reservation_id");
CREATE INDEX IF NOT EXISTS "service_expenses_status_created_at_idx"
  ON "public"."service_expenses" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "service_expenses_driver_status_idx"
  ON "public"."service_expenses" ("driver_id", "status");
CREATE INDEX IF NOT EXISTS "service_expenses_service_id_idx"
  ON "public"."service_expenses" ("service_id");
CREATE INDEX IF NOT EXISTS "alerts_open_severity_created_at_idx"
  ON "public"."alerts" ("archived", "severity", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "portal_notifications_user_read_created_at_idx"
  ON "public"."portal_notifications" ("user_id", "read", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "communications_status_attempts_created_at_idx"
  ON "public"."communications" ("status", "attempts", "created_at");
