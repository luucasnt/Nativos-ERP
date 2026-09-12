-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'user');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('internal', 'portal');

-- CreateEnum
CREATE TYPE "InternalRole" AS ENUM ('financeiro', 'operacional');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ativo', 'inativo');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pendente', 'aprovado', 'rejeitado');

-- CreateEnum
CREATE TYPE "ClientOrigin" AS ENUM ('proprio', 'parceiro');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('proprio', 'terceirizado');

-- CreateEnum
CREATE TYPE "DriverPaymentType" AS ENUM ('diaria', 'comissao', 'salario_mensal', 'mesclado');

-- CreateEnum
CREATE TYPE "OperationalStatus" AS ENUM ('ativo', 'inativo');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ativo', 'manutencao', 'inativo');

-- CreateEnum
CREATE TYPE "CompanyRoleType" AS ENUM ('parceiro', 'fornecedor');

-- CreateEnum
CREATE TYPE "ModeloParceiro" AS ENUM ('comissionado', 'faturado', 'ambos');

-- CreateEnum
CREATE TYPE "DirectCollectionSettlementMode" AS ENUM ('retain_supplier_cost', 'gross_repass');

-- CreateEnum
CREATE TYPE "PixKeyType" AS ENUM ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria');

-- CreateEnum
CREATE TYPE "CatalogItemType" AS ENUM ('tipo_veiculo', 'tipo_bagagem', 'tipo_cadeirinha', 'categoria_despesa', 'categoria_fornecedor_parceiro', 'forma_pagamento', 'motivo_perda', 'pacote_disposicao', 'tipo_concierge');

-- CreateEnum
CREATE TYPE "ReferrerType" AS ENUM ('company', 'driver', 'client', 'pessoa_fisica');

-- CreateEnum
CREATE TYPE "CollectionMode" AS ENUM ('nativos', 'direto', 'faturado');

-- CreateEnum
CREATE TYPE "CollectionAllocationMode" AS ENUM ('single', 'divided', 'flexible');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('aguardando_confirmacao', 'confirmada', 'em_andamento', 'concluida', 'cancelada', 'parcialmente_cancelada');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('transfer_chegada', 'transfer_saida', 'transfer_interno', 'disposicao', 'passeio', 'concierge', 'carrinho_golfe');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('nenhum', 'percentual', 'fixo');

-- CreateEnum
CREATE TYPE "ExecutionType" AS ENUM ('propria', 'fornecedor');

-- CreateEnum
CREATE TYPE "ServiceAcceptanceStatus" AS ENUM ('aguardando_aceite', 'aceito', 'recusado');

-- CreateEnum
CREATE TYPE "ServiceExecutionStatus" AS ENUM ('agendado', 'em_andamento', 'concluido', 'cancelado');

-- CreateEnum
CREATE TYPE "FinanceEntryType" AS ENUM ('receita', 'despesa');

-- CreateEnum
CREATE TYPE "FinanceEntryCategory" AS ENUM ('venda_servico', 'recebimento_cliente', 'pagamento_fornecedor', 'repasse_fornecedor', 'comissao_parceiro', 'comissao_indicacao', 'repasse_motorista', 'recebido_direto_motorista', 'despesa_servico', 'hora_extra', 'km_extra', 'ajuste', 'ajuste_manual', 'estorno', 'transferencia_interna', 'imposto', 'outro');

-- CreateEnum
CREATE TYPE "FinanceEntryStatus" AS ENUM ('programado', 'pendente', 'pago', 'vencido', 'cancelado');

-- CreateEnum
CREATE TYPE "FinanceEntryOriginType" AS ENUM ('direct_collection', 'service_settlement', 'manual', 'compensation');

-- CreateEnum
CREATE TYPE "FinancePartyType" AS ENUM ('cliente', 'motorista', 'fornecedor', 'parceiro', 'interno');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('recebimento', 'pagamento');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('pix', 'cartao', 'dinheiro', 'transferencia', 'boleto', 'outro');

-- CreateEnum
CREATE TYPE "DirectCollectionReceiverType" AS ENUM ('motorista_proprio', 'motorista_terceirizado', 'fornecedor');

-- CreateEnum
CREATE TYPE "FinancialResponsibleType" AS ENUM ('driver', 'company');

-- CreateEnum
CREATE TYPE "DirectCollectionStatus" AS ENUM ('pending', 'received', 'partial', 'not_received', 'reversed');

-- CreateEnum
CREATE TYPE "CompensationCounterpartyType" AS ENUM ('driver', 'supplier');

-- CreateEnum
CREATE TYPE "CompensationStatus" AS ENUM ('confirmada', 'estornada');

-- CreateEnum
CREATE TYPE "BillingCycleStatus" AS ENUM ('aberto', 'fechado', 'faturado', 'parcialmente_pago', 'pago', 'vencido');

-- CreateEnum
CREATE TYPE "CashClosingDifferenceType" AS ENUM ('quebra_caixa', 'erro_lancamento', 'nao_conciliado', 'outro');

-- CreateEnum
CREATE TYPE "ClientCreditOrigin" AS ENUM ('cortesia', 'ajuste', 'estorno', 'pre_pago');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('corrente', 'poupanca', 'caixa', 'digital');

-- CreateEnum
CREATE TYPE "ChangeRequestCategory" AS ENUM ('operacional', 'financeiro');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('solicitada', 'em_analise', 'aprovada', 'rejeitada', 'concluida', 'aguardando_comprovante', 'comprovante_em_analise', 'pago');

-- CreateEnum
CREATE TYPE "ChangeRequestRequesterType" AS ENUM ('company', 'driver');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('info', 'atencao', 'critico');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('overbooking', 'conflito_motorista_veiculo', 'reserva_sem_recursos', 'fornecedor_recusou_sem_aceite', 'parceiro_proximo_limite', 'parceiro_acima_limite', 'fatura_vencida', 'conta_vencida', 'solicitacao_alteracao', 'solicitacao_cancelamento', 'despesa_motorista_pendente', 'financeiro_inconsistente', 'servico_atrasado', 'servico_nao_iniciado', 'sem_motorista', 'sem_veiculo', 'bagagem_incompativel', 'passageiros_acima_capacidade');

-- CreateEnum
CREATE TYPE "EntityRefType" AS ENUM ('reservation', 'service', 'company', 'driver', 'vehicle', 'client', 'finance_entry', 'payment', 'billing_cycle', 'change_request', 'user', 'other');

-- CreateEnum
CREATE TYPE "PortalNotificationType" AS ENUM ('reserva_confirmada', 'alteracao_aprovada', 'cancelamento_aprovado', 'novo_servico', 'pagamento_confirmado', 'comprovante_aprovado', 'despesa_rejeitada', 'documento_disponivel', 'solicitacao_atualizada', 'repasse_confirmado', 'servico_atribuido');

-- CreateEnum
CREATE TYPE "ServiceExpenseStatus" AS ENUM ('pendente', 'aprovado', 'rejeitado');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('pendente', 'enviando', 'enviado', 'falhou', 'cancelado');

-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('cliente', 'parceiro', 'fornecedor', 'motorista', 'interno');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "auth_user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "native_name" TEXT,
    "display_name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'user',
    "account_type" "AccountType" NOT NULL,
    "internal_role" "InternalRole",
    "status" "UserStatus" NOT NULL DEFAULT 'ativo',
    "is_owner" BOOLEAN NOT NULL DEFAULT false,
    "linked_company_id" UUID,
    "linked_driver_id" UUID,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "origin" "ClientOrigin" NOT NULL DEFAULT 'proprio',
    "origin_partner_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "owner_type" "OwnerType" NOT NULL,
    "supplier_id" UUID,
    "is_company_owner_driver" BOOLEAN NOT NULL DEFAULT false,
    "payment_type" "DriverPaymentType" NOT NULL,
    "commission" DECIMAL(5,2),
    "daily_rate" DECIMAL(12,2),
    "salario_mensal" DECIMAL(12,2),
    "portal_email" TEXT,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'pendente',
    "created_from_portal" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by_id" UUID,
    "status" "OperationalStatus" NOT NULL DEFAULT 'ativo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "plate" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "category_id" UUID,
    "capacity" INTEGER NOT NULL,
    "owner_type" "OwnerType" NOT NULL,
    "supplier_id" UUID,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'pendente',
    "created_from_portal" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by_id" UUID,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ativo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "legal_person" BOOLEAN NOT NULL DEFAULT true,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "roles" "CompanyRoleType"[],
    "portal_email" TEXT,
    "modelo_parceiro" "ModeloParceiro",
    "billing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "billing_limit" DECIMAL(12,2),
    "closing_day" INTEGER,
    "invoice_due_day" INTEGER,
    "requires_nf" BOOLEAN NOT NULL DEFAULT false,
    "net_enabled" BOOLEAN NOT NULL DEFAULT false,
    "commission_enabled" BOOLEAN NOT NULL DEFAULT false,
    "commission" DECIMAL(5,2),
    "pix_key" TEXT,
    "pix_key_type" "PixKeyType",
    "pix_favorecido_name" TEXT,
    "saldo_conta_corrente" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "recebe_pagamento_direto" BOOLEAN NOT NULL DEFAULT false,
    "direct_collection_settlement_mode" "DirectCollectionSettlementMode",
    "limite_inadimplencia" DECIMAL(12,2),
    "owner_driver_id" UUID,
    "category_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" UUID NOT NULL,
    "type" "CatalogItemType" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "origin_partner_id" UUID,
    "referrer_type" "ReferrerType",
    "referrer_id" UUID,
    "referrer_name" TEXT,
    "referrer_document" TEXT,
    "commission_percent" DECIMAL(5,2),
    "is_cortesia" BOOLEAN NOT NULL DEFAULT false,
    "is_net_fare" BOOLEAN NOT NULL DEFAULT false,
    "requires_nf" BOOLEAN NOT NULL DEFAULT false,
    "collection_mode" "CollectionMode" NOT NULL DEFAULT 'nativos',
    "collection_allocation_mode" "CollectionAllocationMode" NOT NULL DEFAULT 'single',
    "collection_allocations" JSONB,
    "tax_percent_snapshot" DECIMAL(5,2),
    "tax_amount" DECIMAL(12,2),
    "nf_value" DECIMAL(12,2),
    "status" "ReservationStatus" NOT NULL DEFAULT 'aguardando_confirmacao',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "type" "ServiceType" NOT NULL,
    "execution_type" "ExecutionType" NOT NULL,
    "supplier_id" UUID,
    "driver_id" UUID,
    "vehicle_id" UUID,
    "scheduled_date" TIMESTAMP(3),
    "scheduled_time" TEXT,
    "pickup_location" TEXT,
    "dropoff_location" TEXT,
    "passenger_count" INTEGER,
    "flight_number" TEXT,
    "notes" TEXT,
    "pacote_disposicao_id" UUID,
    "km_incluido" DECIMAL(10,2),
    "valor_hora_extra" DECIMAL(12,2),
    "valor_km_extra" DECIMAL(12,2),
    "horas_extras" DECIMAL(10,2),
    "km_extras" DECIMAL(10,2),
    "original_price" DECIMAL(12,2) NOT NULL,
    "discount_type" "DiscountType" NOT NULL DEFAULT 'nenhum',
    "discount_value" DECIMAL(12,2),
    "discount_reason" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "supplier_cost" DECIMAL(12,2),
    "luggage_10kg" INTEGER NOT NULL DEFAULT 0,
    "luggage_23kg" INTEGER NOT NULL DEFAULT 0,
    "luggage_32kg" INTEGER NOT NULL DEFAULT 0,
    "bebe_conforto" INTEGER NOT NULL DEFAULT 0,
    "cadeirinha" INTEGER NOT NULL DEFAULT 0,
    "booster" INTEGER NOT NULL DEFAULT 0,
    "acceptance_status" "ServiceAcceptanceStatus" NOT NULL DEFAULT 'aguardando_aceite',
    "acceptance_reason" TEXT,
    "execution_status" "ServiceExecutionStatus" NOT NULL DEFAULT 'agendado',
    "driver_can_receive_payment" BOOLEAN NOT NULL DEFAULT false,
    "supplier_payment_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_entries" (
    "id" UUID NOT NULL,
    "type" "FinanceEntryType" NOT NULL,
    "category" "FinanceEntryCategory" NOT NULL,
    "status" "FinanceEntryStatus" NOT NULL DEFAULT 'programado',
    "payment_eligible" BOOLEAN NOT NULL DEFAULT false,
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" TIMESTAMP(3),
    "description" TEXT,
    "party_type" "FinancePartyType" NOT NULL,
    "party_id" UUID,
    "reservation_id" UUID,
    "service_id" UUID,
    "origin_type" "FinanceEntryOriginType" NOT NULL,
    "origin_id" UUID,
    "auto_key" TEXT,
    "estorno_of_id" UUID,
    "reversed_at" TIMESTAMP(3),
    "reversed_by_id" UUID,
    "reversal_reason" TEXT,
    "compensacao_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "finance_entry_id" UUID NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "bank_account_id" UUID,
    "receipt_url" TEXT,
    "estorno_of_id" UUID,
    "reversed_at" TIMESTAMP(3),
    "reversed_by_id" UUID,
    "reversal_reason" TEXT,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciled_at" TIMESTAMP(3),
    "reconciled_by_id" UUID,
    "dedupe_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_collections" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "receiver_type" "DirectCollectionReceiverType" NOT NULL,
    "receiver_id" UUID NOT NULL,
    "financial_responsible_type" "FinancialResponsibleType" NOT NULL,
    "financial_responsible_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "DirectCollectionStatus" NOT NULL DEFAULT 'pending',
    "not_received_reason_id" UUID,
    "reversed_at" TIMESTAMP(3),
    "reversed_by_id" UUID,
    "reversal_reason" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensations" (
    "id" UUID NOT NULL,
    "counterparty_type" "CompensationCounterpartyType" NOT NULL,
    "counterparty_id" UUID NOT NULL,
    "payable_allocation" JSONB NOT NULL,
    "receivable_allocation" JSONB NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "CompensationStatus" NOT NULL DEFAULT 'confirmada',
    "reversed_at" TIMESTAMP(3),
    "reversed_by_id" UUID,
    "reversal_reason" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_cycles" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "closing_day" INTEGER NOT NULL,
    "due_day" INTEGER NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "BillingCycleStatus" NOT NULL DEFAULT 'aberto',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_cycle_reservations" (
    "id" UUID NOT NULL,
    "billing_cycle_id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_cycle_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_closings" (
    "id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "closing_date" TIMESTAMP(3) NOT NULL,
    "opening_balance" DECIMAL(12,2) NOT NULL,
    "total_in" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_out" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_transfers" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "theoretical_balance" DECIMAL(12,2) NOT NULL,
    "counted_balance" DECIMAL(12,2),
    "difference" DECIMAL(12,2),
    "difference_type" "CashClosingDifferenceType",
    "adjustment_finance_entry_id" UUID,
    "performed_by_id" UUID NOT NULL,
    "reopened_at" TIMESTAMP(3),
    "reopened_by_id" UUID,
    "reopen_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_closings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_credits" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "origin" "ClientCreditOrigin" NOT NULL,
    "valid_until" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BankAccountType" NOT NULL,
    "pix_key" TEXT,
    "initial_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_requests" (
    "id" UUID NOT NULL,
    "protocol" TEXT NOT NULL,
    "category" "ChangeRequestCategory" NOT NULL,
    "type" TEXT NOT NULL,
    "requester_type" "ChangeRequestRequesterType" NOT NULL,
    "requester_id" UUID NOT NULL,
    "company_id" UUID,
    "reservation_id" UUID,
    "allocation_details" JSONB,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'solicitada',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "response_note" TEXT,
    "dedupe_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "entity_ref_type" "EntityRefType",
    "entity_ref_id" UUID,
    "persistent" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "archived_by_id" UUID,
    "dedupe_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "PortalNotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "entity_ref_type" "EntityRefType",
    "entity_ref_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" "EntityRefType" NOT NULL,
    "entity_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_expenses" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "receipt_url" TEXT,
    "status" "ServiceExpenseStatus" NOT NULL DEFAULT 'pendente',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "finance_entry_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communications" (
    "id" UUID NOT NULL,
    "template_key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "recipient_type" "RecipientType" NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "variables" JSONB,
    "status" "CommunicationStatus" NOT NULL DEFAULT 'pendente',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "sent_at" TIMESTAMP(3),
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "auto_send" BOOLEAN NOT NULL DEFAULT false,
    "allowed_variables" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "contract_clauses" (
    "id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_user_id_key" ON "users"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_linked_driver_id_key" ON "users"("linked_driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_portal_email_key" ON "drivers"("portal_email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_key" ON "vehicles"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "companies_portal_email_key" ON "companies"("portal_email");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_type_key_key" ON "catalog_items"("type", "key");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_code_key" ON "reservations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "finance_entries_auto_key_key" ON "finance_entries"("auto_key");

-- CreateIndex
CREATE UNIQUE INDEX "payments_dedupe_key_key" ON "payments"("dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "direct_collections_idempotency_key_key" ON "direct_collections"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "compensations_idempotency_key_key" ON "compensations"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "billing_cycles_company_id_period_key" ON "billing_cycles"("company_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "billing_cycle_reservations_billing_cycle_id_reservation_id_key" ON "billing_cycle_reservations"("billing_cycle_id", "reservation_id");

-- CreateIndex
CREATE UNIQUE INDEX "change_requests_protocol_key" ON "change_requests"("protocol");

-- CreateIndex
CREATE UNIQUE INDEX "change_requests_dedupe_key_key" ON "change_requests"("dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "alerts_dedupe_key_key" ON "alerts"("dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "service_expenses_finance_entry_id_key" ON "service_expenses"("finance_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "communications_idempotency_key_key" ON "communications"("idempotency_key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_linked_company_id_fkey" FOREIGN KEY ("linked_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_linked_driver_id_fkey" FOREIGN KEY ("linked_driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_origin_partner_id_fkey" FOREIGN KEY ("origin_partner_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_driver_id_fkey" FOREIGN KEY ("owner_driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_origin_partner_id_fkey" FOREIGN KEY ("origin_partner_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_pacote_disposicao_id_fkey" FOREIGN KEY ("pacote_disposicao_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_estorno_of_id_fkey" FOREIGN KEY ("estorno_of_id") REFERENCES "finance_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_compensacao_id_fkey" FOREIGN KEY ("compensacao_id") REFERENCES "compensations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_finance_entry_id_fkey" FOREIGN KEY ("finance_entry_id") REFERENCES "finance_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_estorno_of_id_fkey" FOREIGN KEY ("estorno_of_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_reconciled_by_id_fkey" FOREIGN KEY ("reconciled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_collections" ADD CONSTRAINT "direct_collections_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_collections" ADD CONSTRAINT "direct_collections_not_received_reason_id_fkey" FOREIGN KEY ("not_received_reason_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_collections" ADD CONSTRAINT "direct_collections_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensations" ADD CONSTRAINT "compensations_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_cycles" ADD CONSTRAINT "billing_cycles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_cycle_reservations" ADD CONSTRAINT "billing_cycle_reservations_billing_cycle_id_fkey" FOREIGN KEY ("billing_cycle_id") REFERENCES "billing_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_cycle_reservations" ADD CONSTRAINT "billing_cycle_reservations_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closings" ADD CONSTRAINT "cash_closings_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closings" ADD CONSTRAINT "cash_closings_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closings" ADD CONSTRAINT "cash_closings_reopened_by_id_fkey" FOREIGN KEY ("reopened_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_credits" ADD CONSTRAINT "client_credits_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_archived_by_id_fkey" FOREIGN KEY ("archived_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_notifications" ADD CONSTRAINT "portal_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_expenses" ADD CONSTRAINT "service_expenses_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_expenses" ADD CONSTRAINT "service_expenses_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_expenses" ADD CONSTRAINT "service_expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_expenses" ADD CONSTRAINT "service_expenses_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_template_key_fkey" FOREIGN KEY ("template_key") REFERENCES "email_templates"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
