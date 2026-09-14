-- Índices das consultas críticas do ERP. Todos usam IF NOT EXISTS para
-- permitir aplicação segura sobre a base já existente.
create index if not exists reservations_status_created_at_idx on public.reservations (status, created_at desc);
create index if not exists reservations_client_id_idx on public.reservations (client_id);
create index if not exists reservations_origin_partner_id_idx on public.reservations (origin_partner_id);

create index if not exists services_reservation_id_created_at_idx on public.services (reservation_id, created_at);
create index if not exists services_schedule_execution_idx on public.services (scheduled_date, execution_status, scheduled_time);
create index if not exists services_supplier_acceptance_execution_idx on public.services (supplier_id, acceptance_status, execution_status);
create index if not exists services_driver_execution_date_idx on public.services (driver_id, execution_status, scheduled_date);
create index if not exists services_vehicle_execution_date_idx on public.services (vehicle_id, execution_status, scheduled_date);

create index if not exists finance_entries_created_at_idx on public.finance_entries (created_at desc);
create index if not exists finance_entries_type_status_created_at_idx on public.finance_entries (type, status, created_at desc);
create index if not exists finance_entries_status_due_date_idx on public.finance_entries (status, due_date);
create index if not exists finance_entries_party_created_at_idx on public.finance_entries (party_type, party_id, created_at desc);
create index if not exists finance_entries_service_status_idx on public.finance_entries (service_id, status);
create index if not exists finance_entries_reservation_id_idx on public.finance_entries (reservation_id);

create index if not exists payments_entry_active_created_at_idx on public.payments (finance_entry_id, reversed_at, created_at desc);
create index if not exists change_requests_status_created_at_idx on public.change_requests (status, created_at);
create index if not exists change_requests_requester_status_idx on public.change_requests (requester_type, requester_id, status);
create index if not exists change_requests_company_id_idx on public.change_requests (company_id);
create index if not exists change_requests_reservation_id_idx on public.change_requests (reservation_id);
create index if not exists service_expenses_status_created_at_idx on public.service_expenses (status, created_at);
create index if not exists service_expenses_driver_status_idx on public.service_expenses (driver_id, status);
create index if not exists service_expenses_service_id_idx on public.service_expenses (service_id);
create index if not exists alerts_open_severity_created_at_idx on public.alerts (archived, severity, created_at desc);
create index if not exists portal_notifications_user_read_created_at_idx on public.portal_notifications (user_id, read, created_at desc);
create index if not exists communications_status_attempts_created_at_idx on public.communications (status, attempts, created_at);
