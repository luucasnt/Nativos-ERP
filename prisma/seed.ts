// Seed de dados de teste (Fase 1 — Fundação).
//
// A parte de cadastro/operacional/financeiro roda sempre, contra o Postgres
// apontado por DATABASE_URL. A parte de provisionamento de login (Supabase
// Auth) só roda se NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
// estiverem configurados — nesta sessão de desenvolvimento local ainda não
// há um projeto Supabase real, então essa parte é pulada com um aviso.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { computeCollectionActor, computeServicePrice } from "../src/lib/reservations/pricing";
import { recalculateReservationStatus } from "../src/lib/reservations/status";
import { recalculateReservationTax } from "../src/lib/reservations/tax";

const prisma = new PrismaClient();

async function seedCatalog() {
  const catalog: Array<{
    type:
      | "tipo_veiculo"
      | "tipo_bagagem"
      | "tipo_cadeirinha"
      | "categoria_despesa"
      | "categoria_fornecedor_parceiro"
      | "forma_pagamento"
      | "motivo_perda"
      | "pacote_disposicao"
      | "tipo_concierge";
    key: string;
    label: string;
    order: number;
  }> = [
    { type: "tipo_veiculo", key: "sedan_executivo", label: "Sedan executivo", order: 1 },
    { type: "tipo_veiculo", key: "suv_executiva", label: "SUV executiva", order: 2 },
    { type: "tipo_veiculo", key: "van_executiva", label: "Van executiva", order: 3 },

    { type: "tipo_bagagem", key: "mala_10kg", label: "Mala até 10kg", order: 1 },
    { type: "tipo_bagagem", key: "mala_23kg", label: "Mala até 23kg", order: 2 },
    { type: "tipo_bagagem", key: "mala_32kg", label: "Mala até 32kg", order: 3 },

    { type: "tipo_cadeirinha", key: "bebe_conforto", label: "Bebê conforto", order: 1 },
    { type: "tipo_cadeirinha", key: "cadeirinha", label: "Cadeirinha", order: 2 },
    { type: "tipo_cadeirinha", key: "booster", label: "Assento booster", order: 3 },

    { type: "categoria_despesa", key: "combustivel", label: "Combustível", order: 1 },
    { type: "categoria_despesa", key: "pedagio", label: "Pedágio", order: 2 },
    { type: "categoria_despesa", key: "estacionamento", label: "Estacionamento", order: 3 },
    { type: "categoria_despesa", key: "alimentacao", label: "Alimentação", order: 4 },
    { type: "categoria_despesa", key: "outro", label: "Outro", order: 5 },

    { type: "categoria_fornecedor_parceiro", key: "hotel", label: "Hotel", order: 1 },
    { type: "categoria_fornecedor_parceiro", key: "agencia", label: "Agência de viagens", order: 2 },
    { type: "categoria_fornecedor_parceiro", key: "imobiliaria", label: "Imobiliária", order: 3 },
    { type: "categoria_fornecedor_parceiro", key: "transportadora", label: "Transportadora", order: 4 },

    { type: "forma_pagamento", key: "pix", label: "PIX", order: 1 },
    { type: "forma_pagamento", key: "cartao", label: "Cartão", order: 2 },
    { type: "forma_pagamento", key: "dinheiro", label: "Dinheiro", order: 3 },

    { type: "motivo_perda", key: "passageiro_nao_compareceu", label: "Passageiro não compareceu", order: 1 },
    { type: "motivo_perda", key: "valor_nao_repassado", label: "Valor não repassado pelo motorista/fornecedor", order: 2 },

    { type: "pacote_disposicao", key: "disposicao_8h", label: "Disposição 8h", order: 1 },
    { type: "pacote_disposicao", key: "disposicao_12h", label: "Disposição 12h", order: 2 },
    { type: "pacote_disposicao", key: "disposicao_24h", label: "Disposição 24h", order: 3 },

    { type: "tipo_concierge", key: "reserva_restaurante", label: "Reserva de restaurante", order: 1 },
    { type: "tipo_concierge", key: "organizacao_evento", label: "Organização de evento", order: 2 },
  ];

  for (const item of catalog) {
    await prisma.catalogItem.upsert({
      where: { type_key: { type: item.type, key: item.key } },
      update: { label: item.label, order: item.order },
      create: item,
    });
  }

  return catalog;
}

async function seedBankAccounts() {
  const caixa = await prisma.bankAccount.upsert({
    where: { id: "00000000-0000-0000-0000-0000000000b1" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-0000000000b1",
      name: "Caixa Nativos",
      type: "caixa",
      initial_balance: 0,
    },
  });

  const contaCorrente = await prisma.bankAccount.upsert({
    where: { id: "00000000-0000-0000-0000-0000000000b2" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-0000000000b2",
      name: "Conta corrente principal",
      type: "corrente",
      pix_key: "34.000.000/0001-00",
      initial_balance: 0,
    },
  });

  return { caixa, contaCorrente };
}

async function seedSettings() {
  await prisma.setting.upsert({
    where: { key: "empresa" },
    update: {},
    create: {
      key: "empresa",
      category: "institucional",
      value: {
        razao_social: "Nativos Experiences Turismo Ltda.",
        cidade: "Trancoso",
        estado: "BA",
        moeda: "BRL",
      },
    },
  });

  await prisma.setting.upsert({
    where: { key: "imposto_padrao" },
    update: {},
    create: {
      key: "imposto_padrao",
      category: "financeiro",
      value: { percentual: 6 },
    },
  });

  // Requisito adicional pós-Fase 1 (itens 2, 3 e 4): padrão global de
  // exibição de valor em documentos — cada reserva/serviço pode substituir
  // este padrão individualmente (voucher_show_price / os_show_price).
  await prisma.setting.upsert({
    where: { key: "documentos_exibicao_valor" },
    update: {},
    create: {
      key: "documentos_exibicao_valor",
      category: "documentos",
      value: { voucher_default: false, os_default: false },
    },
  });
}

async function seedCommissionDefaults() {
  const defaults = [
    { target: "company" as const, category_key: "hotel", commission_percent: 10 },
    { target: "company" as const, category_key: "agencia", commission_percent: 12 },
    { target: "company" as const, category_key: "imobiliaria", commission_percent: 8 },
    { target: "driver" as const, category_key: "terceirizado", commission_percent: 20 },
  ];

  for (const d of defaults) {
    await prisma.commissionDefault.upsert({
      where: { target_category_key: { target: d.target, category_key: d.category_key } },
      update: {},
      create: d,
    });
  }
}

async function seedEmailTemplates() {
  const templates = [
    {
      key: "reserva_confirmada",
      name: "Reserva confirmada",
      subject: "Sua reserva {{codigo_reserva}} foi confirmada",
      category: "operacional",
      auto_send: true,
    },
    {
      key: "alteracao_aprovada",
      name: "Alteração aprovada",
      subject: "Sua solicitação {{protocolo}} foi aprovada",
      category: "operacional",
      auto_send: true,
    },
    {
      key: "cancelamento_aprovado",
      name: "Cancelamento aprovado",
      subject: "Cancelamento da reserva {{codigo_reserva}} confirmado",
      category: "operacional",
      auto_send: true,
    },
    {
      key: "pagamento_confirmado",
      name: "Pagamento confirmado",
      subject: "Recebemos seu pagamento — {{codigo_reserva}}",
      category: "financeiro",
      auto_send: true,
    },
    {
      key: "primeiro_acesso",
      name: "Primeiro acesso ao portal",
      subject: "Seu acesso ao Nativos ERP",
      category: "acesso",
      auto_send: false,
    },
  ];

  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { key: t.key },
      update: {},
      create: {
        key: t.key,
        name: t.name,
        subject: t.subject,
        body: `<p>${t.name}</p>`,
        category: t.category,
        auto_send: t.auto_send,
        allowed_variables: ["codigo_reserva", "protocolo", "nome"],
      },
    });
  }
}

async function seedContractClauses() {
  const clauses = [
    { category: "geral", order: 1, title: "Objeto", content: "Cláusula de objeto do contrato." },
    { category: "geral", order: 2, title: "Vigência", content: "Cláusula de vigência do contrato." },
    { category: "financeiro", order: 1, title: "Condições de pagamento", content: "Cláusula de condições de pagamento." },
    { category: "cancelamento", order: 1, title: "Política de cancelamento", content: "Cláusula de política de cancelamento." },
  ];

  for (const c of clauses) {
    const existing = await prisma.contractClause.findFirst({
      where: { category: c.category, order: c.order },
    });
    if (!existing) {
      await prisma.contractClause.create({ data: c });
    }
  }
}

async function seedCompaniesDriversVehicles() {
  // Parceiro faturado (hotel) — sem execução de serviços, só origina clientes
  // e é faturado mensalmente.
  const parceiroHotel = await prisma.company.upsert({
    where: { id: "10000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "10000000-0000-0000-0000-000000000001",
      name: "Hotel Vila Trancoso",
      legal_person: true,
      document: "12.345.678/0001-01",
      roles: ["parceiro"],
      modelo_parceiro: "faturado",
      billing_enabled: true,
      billing_limit: 50000,
      closing_day: 25,
      invoice_due_day: 10,
      requires_nf: true,
      net_enabled: true,
    },
  });

  // Fornecedor que retém o próprio custo no pagamento direto.
  const fornecedorRetain = await prisma.company.upsert({
    where: { id: "10000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "10000000-0000-0000-0000-000000000002",
      name: "Transportes Costa do Descobrimento",
      legal_person: true,
      document: "23.456.789/0001-02",
      roles: ["fornecedor"],
      recebe_pagamento_direto: true,
      direct_collection_settlement_mode: "retain_supplier_cost",
      pix_key: "23456789000102",
      pix_key_type: "cnpj",
      pix_favorecido_name: "Transportes Costa do Descobrimento Ltda.",
    },
  });

  // Fornecedor que repassa o valor bruto no pagamento direto.
  const fornecedorGross = await prisma.company.upsert({
    where: { id: "10000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "10000000-0000-0000-0000-000000000003",
      name: "Bahia Vans Turismo",
      legal_person: true,
      document: "34.567.890/0001-03",
      roles: ["fornecedor"],
      recebe_pagamento_direto: true,
      direct_collection_settlement_mode: "gross_repass",
      pix_key: "34567890000103",
      pix_key_type: "cnpj",
      pix_favorecido_name: "Bahia Vans Turismo Ltda.",
    },
  });

  // Empresa com os dois papéis simultâneos: agência que também presta
  // serviço como fornecedor, comissionada.
  const agenciaDupla = await prisma.company.upsert({
    where: { id: "10000000-0000-0000-0000-000000000004" },
    update: {},
    create: {
      id: "10000000-0000-0000-0000-000000000004",
      name: "Trancoso Turismo & Receptivo",
      legal_person: true,
      document: "45.678.901/0001-04",
      roles: ["parceiro", "fornecedor"],
      modelo_parceiro: "comissionado",
      commission_enabled: true,
      commission: 10,
    },
  });

  // Motorista próprio (frota Nativos), diária.
  const motoristaProprio = await prisma.driver.upsert({
    where: { id: "20000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000001",
      name: "Carlos Andrade",
      owner_type: "proprio",
      payment_type: "diaria",
      daily_rate: 300,
      portal_email: "carlos.andrade@nativos-driver.test",
      approval_status: "aprovado",
      status: "ativo",
    },
  });

  // Motorista terceirizado vinculado ao fornecedor que retém o custo.
  const motoristaTerceirizado1 = await prisma.driver.upsert({
    where: { id: "20000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000002",
      name: "José Ferreira",
      owner_type: "terceirizado",
      supplier_id: fornecedorRetain.id,
      payment_type: "comissao",
      commission: 20,
      approval_status: "aprovado",
      status: "ativo",
    },
  });

  // Motorista dono do fornecedor que repassa bruto — login compartilhado
  // (is_company_owner_driver).
  const motoristaDono = await prisma.driver.upsert({
    where: { id: "20000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000003",
      name: "Ricardo Bahia",
      owner_type: "terceirizado",
      supplier_id: fornecedorGross.id,
      is_company_owner_driver: true,
      payment_type: "mesclado",
      commission: 15,
      daily_rate: 250,
      portal_email: "ricardo.bahia@nativos-driver.test",
      approval_status: "aprovado",
      status: "ativo",
    },
  });

  await prisma.company.update({
    where: { id: fornecedorGross.id },
    data: { owner_driver_id: motoristaDono.id },
  });

  // Motorista terceirizado cadastrado via portal, aguardando aprovação.
  const motoristaPendente = await prisma.driver.upsert({
    where: { id: "20000000-0000-0000-0000-000000000004" },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000004",
      name: "Pedro Lima",
      owner_type: "terceirizado",
      supplier_id: fornecedorGross.id,
      payment_type: "diaria",
      daily_rate: 280,
      approval_status: "pendente",
      created_from_portal: true,
      status: "inativo",
    },
  });

  const veiculoProprio = await prisma.vehicle.upsert({
    where: { id: "30000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000001",
      plate: "NAT1A23",
      model: "Toyota Hilux SW4",
      capacity: 6,
      owner_type: "proprio",
      approval_status: "aprovado",
      status: "ativo",
    },
  });

  const veiculoTerceirizado = await prisma.vehicle.upsert({
    where: { id: "30000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000002",
      plate: "FOR2B34",
      model: "Mercedes-Benz Sprinter",
      capacity: 15,
      owner_type: "terceirizado",
      supplier_id: fornecedorRetain.id,
      approval_status: "aprovado",
      status: "ativo",
    },
  });

  return {
    parceiroHotel,
    fornecedorRetain,
    fornecedorGross,
    agenciaDupla,
    motoristaProprio,
    motoristaTerceirizado1,
    motoristaDono,
    motoristaPendente,
    veiculoProprio,
    veiculoTerceirizado,
  };
}

async function seedClients(parceiroHotel: { id: string }) {
  const clientePropio = await prisma.client.upsert({
    where: { id: "40000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "40000000-0000-0000-0000-000000000001",
      name: "Marina Souza",
      document: "111.111.111-11",
      email: "marina.souza@example.test",
      origin: "proprio",
    },
  });

  const clienteParceiro = await prisma.client.upsert({
    where: { id: "40000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "40000000-0000-0000-0000-000000000002",
      name: "John Miller",
      document: "PASSPORT-99887766",
      email: "john.miller@example.test",
      origin: "parceiro",
      origin_partner_id: parceiroHotel.id,
    },
  });

  return { clientePropio, clienteParceiro };
}

async function seedReservationsAndServices(refs: {
  clientePropio: { id: string };
  clienteParceiro: { id: string };
  parceiroHotel: { id: string };
  fornecedorRetain: { id: string };
  fornecedorGross: { id: string };
  agenciaDupla: { id: string };
  motoristaProprio: { id: string };
  motoristaTerceirizado1: { id: string };
  motoristaDono: { id: string };
  veiculoProprio: { id: string };
  veiculoTerceirizado: { id: string };
}) {
  // Variável 1: execução própria vs. fornecedor.
  // Variável 2: quem cobra o passageiro (nativos / motorista próprio / fornecedor).
  // Variável 3: indicação (com/sem, indicador empresa/motorista).

  // R1 — execução própria, cobrança pela Nativos, sem indicação.
  const r1 = await prisma.reservation.upsert({
    where: { id: "50000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "50000000-0000-0000-0000-000000000001",
      code: "RES-2026-000001",
      client_id: refs.clientePropio.id,
      collection_mode: "nativos",
      services: {
        create: [
          {
            id: "60000000-0000-0000-0000-000000000001",
            type: "transfer_chegada",
            execution_type: "propria",
            driver_id: refs.motoristaProprio.id,
            vehicle_id: refs.veiculoProprio.id,
            original_price: 450,
            price: computeServicePrice(450, "nenhum", null),
            collection_actor: computeCollectionActor("nativos", "propria"),
            acceptance_status: "aceito",
            execution_status: "concluido",
          },
        ],
      },
    },
  });

  // R2 — execução própria, cobrança direta pelo motorista próprio, com
  // desconto (que não pode afetar supplier_cost porque não há custo de
  // fornecedor aqui — o próprio é sempre custo interno).
  const r2 = await prisma.reservation.upsert({
    where: { id: "50000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "50000000-0000-0000-0000-000000000002",
      code: "RES-2026-000002",
      client_id: refs.clientePropio.id,
      collection_mode: "direto",
      services: {
        create: [
          {
            id: "60000000-0000-0000-0000-000000000002",
            type: "disposicao",
            execution_type: "propria",
            driver_id: refs.motoristaProprio.id,
            vehicle_id: refs.veiculoProprio.id,
            pacote_disposicao_id: null,
            original_price: 1200,
            discount_type: "percentual",
            discount_value: 10,
            discount_reason: "Cliente recorrente",
            price: computeServicePrice(1200, "percentual", 10),
            collection_actor: computeCollectionActor("direto", "propria"),
            acceptance_status: "aceito",
            execution_status: "concluido",
            driver_can_receive_payment: true,
            supplier_payment_confirmed: true,
          },
        ],
      },
    },
  });

  // R3 — execução por fornecedor, cobrança pela Nativos, com indicação de
  // outra empresa (agência com papel duplo).
  const r3 = await prisma.reservation.upsert({
    where: { id: "50000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "50000000-0000-0000-0000-000000000003",
      code: "RES-2026-000003",
      client_id: refs.clientePropio.id,
      collection_mode: "nativos",
      referrer_type: "company",
      referrer_id: refs.agenciaDupla.id,
      commission_percent: 8,
      services: {
        create: [
          {
            id: "60000000-0000-0000-0000-000000000003",
            type: "transfer_saida",
            execution_type: "fornecedor",
            supplier_id: refs.fornecedorRetain.id,
            driver_id: refs.motoristaTerceirizado1.id,
            vehicle_id: refs.veiculoTerceirizado.id,
            original_price: 500,
            price: computeServicePrice(500, "nenhum", null),
            collection_actor: computeCollectionActor("nativos", "fornecedor"),
            supplier_cost: 350,
            acceptance_status: "aceito",
            execution_status: "agendado",
          },
        ],
      },
    },
  });

  // R4 — execução por fornecedor que retém o próprio custo no pagamento
  // direto (só a margem da Nativos aparece como repasse no razão).
  const r4 = await prisma.reservation.upsert({
    where: { id: "50000000-0000-0000-0000-000000000004" },
    update: {},
    create: {
      id: "50000000-0000-0000-0000-000000000004",
      code: "RES-2026-000004",
      client_id: refs.clienteParceiro.id,
      origin_partner_id: refs.parceiroHotel.id,
      collection_mode: "direto",
      services: {
        create: [
          {
            id: "60000000-0000-0000-0000-000000000004",
            type: "transfer_interno",
            execution_type: "fornecedor",
            supplier_id: refs.fornecedorRetain.id,
            driver_id: refs.motoristaTerceirizado1.id,
            original_price: 300,
            price: computeServicePrice(300, "nenhum", null),
            collection_actor: computeCollectionActor("direto", "fornecedor"),
            supplier_cost: 220,
            acceptance_status: "aguardando_aceite",
            execution_status: "agendado",
          },
        ],
      },
    },
  });

  // R5 — execução por fornecedor dono-motorista (login compartilhado), que
  // repassa o valor bruto no pagamento direto, com indicação do próprio
  // motorista dono.
  const r5 = await prisma.reservation.upsert({
    where: { id: "50000000-0000-0000-0000-000000000005" },
    update: {},
    create: {
      id: "50000000-0000-0000-0000-000000000005",
      code: "RES-2026-000005",
      client_id: refs.clientePropio.id,
      collection_mode: "direto",
      referrer_type: "driver",
      referrer_id: refs.motoristaDono.id,
      commission_percent: 5,
      services: {
        create: [
          {
            id: "60000000-0000-0000-0000-000000000005",
            type: "passeio",
            execution_type: "fornecedor",
            supplier_id: refs.fornecedorGross.id,
            driver_id: refs.motoristaDono.id,
            original_price: 800,
            price: computeServicePrice(800, "nenhum", null),
            collection_actor: computeCollectionActor("direto", "fornecedor"),
            supplier_cost: 600,
            acceptance_status: "aceito",
            execution_status: "concluido",
            driver_can_receive_payment: true,
            supplier_payment_confirmed: true,
          },
        ],
      },
    },
  });

  // R6 — reserva faturada (parceiro), tarifa NET (sem comissão), cortesia
  // não se aplica; indicação por pessoa física avulsa.
  const r6 = await prisma.reservation.upsert({
    where: { id: "50000000-0000-0000-0000-000000000006" },
    update: {},
    create: {
      id: "50000000-0000-0000-0000-000000000006",
      code: "RES-2026-000006",
      client_id: refs.clienteParceiro.id,
      origin_partner_id: refs.parceiroHotel.id,
      collection_mode: "faturado",
      is_net_fare: true,
      requires_nf: true,
      referrer_type: "pessoa_fisica",
      referrer_name: "Ana Concierge",
      referrer_document: "222.222.222-22",
      commission_percent: 5,
      services: {
        create: [
          {
            id: "60000000-0000-0000-0000-000000000006",
            type: "concierge",
            execution_type: "propria",
            original_price: 600,
            price: computeServicePrice(600, "nenhum", null),
            collection_actor: computeCollectionActor("faturado", "propria"),
            acceptance_status: "aceito",
            execution_status: "agendado",
          },
        ],
      },
    },
  });

  // Deixa o motor recalcular status e imposto/NF a partir dos serviços,
  // em vez de hardcoded — a mesma rotina usada pelas Server Actions do
  // admin (garante que o seed e o app real ficam sempre em sincronia).
  for (const reservation of [r1, r2, r3, r4, r5, r6]) {
    await recalculateReservationStatus(reservation.id);
    await recalculateReservationTax(reservation.id);
  }

  return { r1, r2, r3, r4, r5, r6 };
}

async function seedFinanceExamples(bankAccounts: {
  caixa: { id: string };
  contaCorrente: { id: string };
}) {
  // Um lançamento "programado" (serviço ainda não concluído — não elegível
  // a pagamento) e um "pendente"/"pago" (serviço concluído) para provar que
  // o schema sustenta o ciclo completo do razão.
  const programado = await prisma.financeEntry.upsert({
    where: { id: "70000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "70000000-0000-0000-0000-000000000001",
      type: "receita",
      category: "venda_servico",
      status: "programado",
      payment_eligible: false,
      amount: 500,
      party_type: "cliente",
      reservation_id: "50000000-0000-0000-0000-000000000003",
      service_id: "60000000-0000-0000-0000-000000000003",
      origin_type: "manual",
      auto_key: "seed-programado-r3",
    },
  });

  const pendente = await prisma.financeEntry.upsert({
    where: { id: "70000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "70000000-0000-0000-0000-000000000002",
      type: "receita",
      category: "recebimento_cliente",
      status: "pago",
      payment_eligible: true,
      amount: 450,
      party_type: "cliente",
      reservation_id: "50000000-0000-0000-0000-000000000001",
      service_id: "60000000-0000-0000-0000-000000000001",
      origin_type: "service_settlement",
      auto_key: "seed-pago-r1",
    },
  });

  await prisma.payment.upsert({
    where: { id: "80000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "80000000-0000-0000-0000-000000000001",
      finance_entry_id: pendente.id,
      type: "recebimento",
      amount: 450,
      payment_method: "pix",
      bank_account_id: bankAccounts.contaCorrente.id,
      dedupe_key: "seed-payment-r1",
      reconciled: true,
      reconciled_at: new Date(),
    },
  });

  return { programado, pendente };
}

async function main() {
  console.log("Seed: catálogo…");
  await seedCatalog();

  console.log("Seed: contas bancárias…");
  const bankAccounts = await seedBankAccounts();

  console.log("Seed: configurações…");
  await seedSettings();

  console.log("Seed: regras de comissão padrão…");
  await seedCommissionDefaults();

  console.log("Seed: templates de e-mail…");
  await seedEmailTemplates();

  console.log("Seed: cláusulas de contrato…");
  await seedContractClauses();

  console.log("Seed: empresas, motoristas e veículos…");
  const registry = await seedCompaniesDriversVehicles();

  console.log("Seed: clientes…");
  const clients = await seedClients(registry.parceiroHotel);

  console.log("Seed: reservas e serviços (3 variáveis comerciais)…");
  await seedReservationsAndServices({ ...registry, ...clients });

  console.log("Seed: exemplos de lançamento financeiro…");
  await seedFinanceExamples(bankAccounts);

  const hasSupabaseCredentials =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!hasSupabaseCredentials) {
    console.log(
      "\nAviso: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados — " +
        "logins de teste (admin interno, portal parceiro/fornecedor, portal motorista) " +
        "não foram provisionados no Supabase Auth. Configure um projeto Supabase real " +
        "e rode `npm run prisma:seed` novamente para criar esses acessos.",
    );
  } else {
    console.log("Seed: provisionando logins de teste no Supabase Auth…");
    const { createInternalUser, createPortalUser } = await import(
      "../src/lib/auth/provision-user"
    );

    const admin = await createInternalUser({
      email: "admin@nativosexperiences.test",
      nativeName: "Administrador Nativos",
      internalRole: "operacional",
      isOwner: true,
    });
    console.log(`  admin@nativosexperiences.test — senha temporária: ${admin.temporaryPassword}`);

    const fornecedorLogin = await createPortalUser({
      email: registry.fornecedorRetain.portal_email ?? "fornecedor@nativos-portal.test",
      nativeName: registry.fornecedorRetain.name,
      linkedCompanyId: registry.fornecedorRetain.id,
    });
    console.log(
      `  ${fornecedorLogin.user.email} — senha temporária: ${fornecedorLogin.temporaryPassword}`,
    );

    const motoristaLogin = await createPortalUser({
      email: registry.motoristaProprio.portal_email ?? "motorista@nativos-portal.test",
      nativeName: registry.motoristaProprio.name,
      linkedDriverId: registry.motoristaProprio.id,
    });
    console.log(
      `  ${motoristaLogin.user.email} — senha temporária: ${motoristaLogin.temporaryPassword}`,
    );
  }

  console.log("\nSeed concluído.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
