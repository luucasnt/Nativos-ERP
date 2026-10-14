"use server";

import { notifyCompanyPortalUsers } from "@/lib/notifications";
import { Prisma as PrismaRuntime } from "@prisma/client";
import { financeBalance, requestEntryIds } from "@/lib/finance/remittance-summary";
import { unstable_rethrow } from "next/navigation";
import { requireOwnerUser, requireFinancialUser } from "@/lib/auth/get-current-user";
import { provisionCompanyOrDriverLogin } from "@/lib/auth/provision-user";
import { driverAccessSchema, supplierAccessDriver, supplierRemittanceEntry, supplierRemittanceSchema, validateRemittanceAmount } from "@/lib/change-requests/supplier-workflows";
import { validatePaymentProof } from "@/lib/uploads/payment-proof";
import { createPayment } from "@/lib/finance/ledger";
import { parsePaymentDate } from "@/lib/finance/payment-date";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { reviewChangeRequest } from "@/lib/change-requests/review";
import { prisma } from "@/lib/prisma";
import { cancelReservation } from "@/lib/reservations/cancellation";
import type { ChangeRequestStatus, Prisma } from "@prisma/client";

const statusSchema = z.enum([
  "solicitada",
  "em_analise",
  "aprovada",
  "rejeitada",
  "concluida",
  "aguardando_comprovante",
  "comprovante_em_analise",
  "pago",
]);

export async function updateChangeRequestStatus(id: string, statusInput: string, responseNote: string) {
  const user = await requireInternalUser();
  const status = statusSchema.parse(statusInput);

  const request = await prisma.changeRequest.findUniqueOrThrow({ where: { id } });
  if (request.type === "acesso_motorista" && (request.allocation_details as Record<string, unknown> | null)?.provisioning === true) throw new Error("A criação deste acesso está em andamento. Aguarde a conclusão.");
  if (request.type === "acesso_motorista" && !["em_analise", "rejeitada"].includes(status)) throw new Error("Use Aprovar e criar acesso para concluir esta solicitação.");
  if (request.type === "pagamento_repasse_fornecedor") {
    await requireFinancialUser();
    if (!["em_analise", "rejeitada"].includes(status)) throw new Error("Use Confirmar recebimento para registrar este repasse no financeiro.");
  }
  if (["pagamento_fornecedor", "repasse_nativos"].includes(request.type)) await requireFinancialUser();
  const allocation = request.allocation_details as Record<string, unknown> | null;
  if (request.type === "repasse_nativos" && allocation?.origem === "cobranca_direta_fornecedor" && ["pago", "concluida"].includes(status)) {
    const ids = Array.isArray(allocation.entry_ids) ? allocation.entry_ids.filter((value): value is string => typeof value === "string") : [];
    if (!ids.length || await prisma.financeEntry.count({ where: { id: { in: ids }, party_id: request.company_id, party_type: "fornecedor", type: "receita", status: "pago" } }) !== ids.length) throw new Error("Confirme primeiro o recebimento vinculado no financeiro. Este protocolo não pode baixar valores por uma mudança de etapa.");
  }
  if (["pagamento_fornecedor", "repasse_nativos"].includes(request.type) && ["pago", "concluida"].includes(status)) {
    const ids = requestEntryIds(request.allocation_details);
    if (!ids.length || await prisma.financeEntry.count({ where: { id: { in: ids }, party_type: "fornecedor", party_id: request.company_id, status: "pago", reversed_at: null } }) !== ids.length) throw new Error("Registre primeiro a movimentação financeira no próprio pedido. Mudar a etapa não confirma um pagamento.");
  }
  const transitions: Record<ChangeRequestStatus, ChangeRequestStatus[]> = {
    solicitada: ["em_analise", "aprovada", "rejeitada"],
    em_analise: ["aprovada", "rejeitada"],
    aprovada: ["concluida", "aguardando_comprovante", "pago"],
    rejeitada: [],
    concluida: [],
    aguardando_comprovante: ["comprovante_em_analise", "pago", "rejeitada"],
    comprovante_em_analise: ["pago", "rejeitada", "aguardando_comprovante"],
    pago: ["concluida"],
  };
  if (status !== request.status && !transitions[request.status].includes(status)) {
    throw new Error("Esta mudança de status não é permitida para a etapa atual.");
  }

  // Cancelamento é o único pedido cujo efeito é inequívoco e seguro para
  // automatizar. Alterações textuais continuam exigindo conferência humana.
  if (request.type === "cancelamento" && status === "aprovada") {
    if (!request.reservation_id) throw new Error("A solicitação não está vinculada a uma reserva.");
    await cancelReservation(request.reservation_id);
  }

  await reviewChangeRequest({
    id,
    status,
    reviewerId: user.id,
    responseNote,
    expectedStatus: request.status,
  });

  await Promise.allSettled([logAudit({
    actorId: user.id,
    action: "solicitacao_revisada",
    entityType: "change_request",
    entityId: id,
    metadata: { status, responseNote },
  })]);

  revalidatePath("/admin/solicitacoes");
  if (request.reservation_id) revalidatePath(`/admin/reservas/${request.reservation_id}`);
}

export async function approveSupplierDriverAccess(id: string) {
  const actor = await requireOwnerUser();
  let claimed = false;
  try {
    const request = await prisma.changeRequest.findUniqueOrThrow({ where: { id: z.string().uuid().parse(id) } });
    if (request.type !== "acesso_motorista" || !request.company_id || !["solicitada", "em_analise"].includes(request.status)) throw new Error("Esta solicitação não está disponível para criação de acesso.");
    if ((request.allocation_details as Record<string, unknown> | null)?.provisioning === true && request.updated_at.getTime() > Date.now() - 5 * 60_000) throw new Error("A criação deste acesso está em andamento. Aguarde a conclusão.");
    const details = driverAccessSchema.parse(request.allocation_details);
    const driver = await supplierAccessDriver(details.driver_id, request.company_id);
    const company = await prisma.company.findUniqueOrThrow({ where: { id: request.company_id } });
    if (!company.roles.includes("fornecedor")) throw new Error("O fornecedor não está ativo.");
    const existing = await prisma.user.findFirst({ where: { OR: [{ linked_driver_id: driver.id }, { email: { equals: details.email, mode: "insensitive" } }] } });
    if (existing && (existing.account_type !== "portal" || (existing.linked_driver_id !== driver.id && !(driver.is_company_owner_driver && existing.linked_company_id === request.company_id && !existing.linked_driver_id)) || existing.status !== "ativo")) throw new Error("O e-mail ou acesso já está em uso. Revise o cadastro antes de aprovar.");
    if (driver.is_company_owner_driver) {
      if (!company.portal_email || company.portal_email.toLowerCase() !== details.email.toLowerCase()) throw new Error("O titular que também dirige usa o mesmo e-mail de acesso da empresa. Confira esse e-mail antes de aprovar.");
      const companyAccess = await prisma.user.findFirst({ where: { linked_company_id: company.id } });
      if (companyAccess && (companyAccess.account_type !== "portal" || companyAccess.status !== "ativo" || (companyAccess.linked_driver_id && companyAccess.linked_driver_id !== driver.id))) throw new Error("Revise o acesso compartilhado da empresa antes de vincular este motorista.");
    }
    const claim = await prisma.changeRequest.updateMany({ where: { id, status: request.status, updated_at: request.updated_at }, data: { status: "em_analise", allocation_details: { ...details, provisioning: true } } });
    if (claim.count !== 1) throw new Error("Esta solicitação foi atualizada. Recarregue a página.");
    claimed = true;
    await prisma.driver.update({ where: { id: driver.id }, data: { portal_email: details.email } });
    const result = await provisionCompanyOrDriverLogin({ driverId: driver.id });
    await prisma.$transaction(async tx => {
      await tx.changeRequest.update({ where: { id }, data: { status: "concluida", reviewed_by_id: actor.id, reviewed_at: new Date(), allocation_details: { ...details, user_id: result.user.id }, response_note: "Acesso ao portal do motorista criado e vinculado ao cadastro aprovado." } });
      await tx.auditLog.create({ data: { actor_id: actor.id, action: "acesso_motorista_aprovado", entity_type: "change_request", entity_id: id, metadata: { driverId: driver.id, companyId: request.company_id, userId: result.user.id } } });
    });
    await reviewChangeRequest({ id, status: "concluida", reviewerId: actor.id, responseNote: "Acesso ao portal do motorista criado e vinculado ao cadastro aprovado." });
    revalidatePath("/admin/solicitacoes"); revalidatePath("/portal/empresa/equipe"); revalidatePath("/portal/empresa/solicitacoes");
    return { error: null, email: result.user.email, temporaryPassword: result.created ? result.temporaryPassword : null };
  } catch (error) { unstable_rethrow(error); return { error: error instanceof Error ? error.message : "Falha ao aprovar acesso.", email: null, temporaryPassword: null }; }
  finally {
    if (claimed) {
      const request = await prisma.changeRequest.findUnique({ where: { id } });
      if (request?.status === "em_analise" && (request.allocation_details as Record<string, unknown> | null)?.provisioning === true) {
        const details = { ...(request.allocation_details as Prisma.JsonObject) }; delete details.provisioning;
        await prisma.changeRequest.updateMany({ where: { id, status: "em_analise", updated_at: request.updated_at }, data: { allocation_details: details } });
      }
    }
  }
}

export async function confirmSupplierRemittance(id: string, bankAccountId: string) {
  const actor = await requireFinancialUser();
  try {
    const request = await prisma.changeRequest.findUniqueOrThrow({ where: { id: z.string().uuid().parse(id) } });
    if (request.type !== "pagamento_repasse_fornecedor" || !request.company_id || ["rejeitada", "concluida"].includes(request.status)) throw new Error("Esta solicitação não está disponível para confirmação financeira.");
    const details = supplierRemittanceSchema.parse(request.allocation_details);
    // O comprovante foi anexado pelo requerente autenticado, e não pelo revisor.
    const proof = await validatePaymentProof(details.receipt_url, details.submitted_by_id);
    const previous = await prisma.payment.findUnique({ where: { dedupe_key: `supplier-request:${id}` } });
    let payment = previous;
    if (!payment) {
      const { entry, balance } = await supplierRemittanceEntry(details.entry_id, request.company_id);
      if (entry.reservation_id !== request.reservation_id) throw new Error("O repasse não corresponde à reserva solicitada.");
      validateRemittanceAmount(details.amount, balance, details.payment_date);
      payment = await createPayment({ finance_entry_id: entry.id, type: "recebimento", amount: details.amount, payment_method: details.payment_method, occurred_at: parsePaymentDate(details.payment_date), bank_account_id: z.string().uuid().parse(bankAccountId), receipt_url: proof, dedupe_key: `supplier-request:${id}`, supplierRequest: { id, reviewerId: actor.id } });
    }
    if (payment.reversed_at || payment.estorno_of_id) throw new Error("O recebimento foi estornado. Revise o financeiro antes de atualizar o protocolo.");
    await reviewChangeRequest({ id, status: "pago", reviewerId: actor.id, responseNote: "Repasse recebido pela Nativos e registrado no lançamento financeiro vinculado." });
    revalidatePath("/admin/solicitacoes"); revalidatePath("/admin/financeiro"); revalidatePath(`/admin/financeiro/${details.entry_id}`); revalidatePath("/portal/empresa/financeiro"); revalidatePath("/portal/empresa/solicitacoes");
    if (request.reservation_id) revalidatePath(`/admin/reservas/${request.reservation_id}`);
    return { error: null };
  } catch (error) { unstable_rethrow(error); return { error: error instanceof Error ? error.message : "Falha ao confirmar repasse." }; }
}

// Registra a transferência já realizada sem uma aprovação intermediária.
// Pedido, pagamentos e auditoria são confirmados na mesma transação.
export async function paySupplierRequest(id: string, input: { amount: string; paymentDate: string; paymentMethod: string; bankAccountId: string; receiptUrl: string; dedupeKey: string }) {
  const actor = await requireFinancialUser();
  try {
    z.string().uuid().parse(id); z.string().uuid().parse(input.dedupeKey);
    const bankAccountId = z.string().uuid().parse(input.bankAccountId);
    const method = z.enum(["pix", "transferencia", "dinheiro", "cartao", "boleto", "outro"]).parse(input.paymentMethod);
    const occurredAt = parsePaymentDate(input.paymentDate);
    const amountText = z.string().trim().regex(/^\d+(?:[.,]\d{1,2})?$/, "Informe um valor válido com até duas casas decimais.").parse(input.amount);
    const amount = new PrismaRuntime.Decimal(amountText.replace(",", "."));
    if (!amount.isFinite() || !amount.isPositive() || amount.decimalPlaces() > 2) throw new Error("Informe um valor válido com até duas casas decimais.");
    const receipt = await validatePaymentProof(input.receiptUrl, actor.id);
    if (!receipt) throw new Error("Anexe o comprovante do pagamento ao fornecedor.");
    const changed = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM change_requests WHERE id = ${id}::uuid FOR UPDATE`;
      const request = await tx.changeRequest.findUniqueOrThrow({ where: { id } });
      if (!["pagamento_fornecedor", "repasse_nativos"].includes(request.type) || !request.company_id || request.status === "rejeitada") throw new Error("Este pedido não está disponível para pagamento ao fornecedor.");
      const ids = requestEntryIds(request.allocation_details).sort();
      if (!ids.length) throw new Error("Pedido sem lançamentos financeiros vinculados.");
      const batchKeys = ids.map(entryId => `supplier-payout:${id}:${input.dedupeKey}:${entryId}`);
      const previous = await tx.payment.findMany({ where: { dedupe_key: { in: batchKeys } } });
      if (previous.length) {
        if (previous.some(p => p.reversed_at || p.estorno_of_id)) throw new Error("Este pagamento foi estornado. Confira o lançamento financeiro.");
        return false;
      }
      if (["pago", "concluida"].includes(request.status)) throw new Error("Este pedido já está encerrado. Confira o extrato.");
      const relations = await tx.financeEntry.findMany({ where: { id: { in: ids } }, select: { reservation_id: true } });
      const reservationIds = [...new Set(relations.map(e => e.reservation_id).filter((v): v is string => Boolean(v)))].sort();
      for (const reservationId of reservationIds) await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${reservationId}::uuid FOR UPDATE`;
      for (const entryId of ids) await tx.$queryRaw`SELECT id FROM finance_entries WHERE id = ${entryId}::uuid FOR UPDATE`;
      const entries = await tx.financeEntry.findMany({ where: { id: { in: ids } }, include: { compensacao: true, payments: { where: { reversed_at: null, estorno_of_id: null } } }, orderBy: { id: "asc" } });
      if (entries.length !== ids.length || entries.some(e => e.type !== "despesa" || e.party_type !== "fornecedor" || e.party_id !== request.company_id || e.reversed_at || e.status === "cancelado")) throw new Error("O pedido contém lançamento incompatível ou de outro fornecedor.");
      const balances = entries.map(e => new PrismaRuntime.Decimal(financeBalance(e).toFixed(2)));
      const total = balances.reduce((sum, b) => sum.plus(b), new PrismaRuntime.Decimal(0));
      if (amount.gt(total) || total.lte(0)) throw new Error("O saldo mudou. Atualize a página antes de registrar o pagamento.");
      if (entries.length > 1 && !amount.eq(total)) throw new Error("Para um pedido com vários serviços, informe o saldo total. Pagamentos parciais podem ser registrados no lançamento de cada serviço.");
      const paymentIds: string[] = [];
      for (let i = 0; i < entries.length; i++) {
        if (balances[i].lte(0)) continue;
        const payment = await createPayment({ finance_entry_id: entries[i].id, type: "pagamento", amount: entries.length === 1 ? amount : balances[i], payment_method: method, occurred_at: occurredAt, bank_account_id: bankAccountId, receipt_url: receipt, dedupe_key: batchKeys[i] }, tx);
        paymentIds.push(payment.id);
      }
      const oldDetails = request.allocation_details as Prisma.JsonObject;
      const oldIds = Array.isArray(oldDetails.payment_ids) ? oldDetails.payment_ids.filter((v): v is string => typeof v === "string") : [];
      await tx.changeRequest.update({ where: { id }, data: { status: amount.eq(total) ? "pago" : "aprovada", reviewed_by_id: actor.id, reviewed_at: new Date(), response_note: amount.eq(total) ? "Pagamento ao fornecedor registrado. Saldo quitado." : "Pagamento parcial registrado. O saldo restante continua disponível neste pedido.", allocation_details: { ...oldDetails, payment_ids: [...oldIds, ...paymentIds] } } });
      await tx.auditLog.create({ data: { actor_id: actor.id, action: "pagamento_fornecedor_registrado_por_pedido", entity_type: "change_request", entity_id: id, metadata: { entryIds: ids, paymentIds, amount: amount.toString(), bankAccountId, paymentDate: input.paymentDate } } });
      return true;
    }, { maxWait: 10000, timeout: 30000 });
    if (changed) {
      const request = await prisma.changeRequest.findUniqueOrThrow({ where: { id }, select: { company_id: true, protocol: true } });
      if (request.company_id) await Promise.allSettled([notifyCompanyPortalUsers({ companyId: request.company_id, type: "repasse_confirmado", message: `Pagamento de R$ ${amount.toFixed(2)} registrado no pedido ${request.protocol}. Consulte o financeiro para ver o saldo e o comprovante.`, entityRefType: "change_request", entityRefId: id })]);
    }
    revalidatePath("/admin/solicitacoes"); revalidatePath("/admin/financeiro"); revalidatePath("/portal/empresa/financeiro"); revalidatePath("/portal/empresa/solicitacoes");
    return { error: null };
  } catch (error) { unstable_rethrow(error); return { error: error instanceof z.ZodError ? error.issues[0]?.message ?? "Confira os dados do pagamento." : error instanceof Error && error.name === "Error" ? error.message : "Não foi possível registrar o pagamento. Atualize a página e tente novamente." }; }
}

export async function rejectRemittanceRequest(id: string, note: string) {
  await requireFinancialUser();
  try {
    const request = await prisma.changeRequest.findUniqueOrThrow({ where: { id: z.string().uuid().parse(id) } });
    if (!["pagamento_fornecedor", "pagamento_repasse_fornecedor", "repasse_nativos"].includes(request.type)) throw new Error("Este pedido não é um repasse de fornecedor.");
    await updateChangeRequestStatus(id, "rejeitada", z.string().trim().min(1, "Informe o motivo.").max(800).parse(note));
    revalidatePath("/portal/empresa/financeiro"); revalidatePath("/portal/empresa/solicitacoes");
    return { error: null };
  } catch (error) { unstable_rethrow(error); return { error: error instanceof Error ? error.message : "Não foi possível recusar o pedido." }; }
}

export async function closeSettledRemittanceRequest(id: string) {
  const actor = await requireFinancialUser();
  try {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM change_requests WHERE id = ${z.string().uuid().parse(id)}::uuid FOR UPDATE`;
      const request = await tx.changeRequest.findUniqueOrThrow({ where: { id } });
      if (!["pagamento_fornecedor", "repasse_nativos"].includes(request.type) || !request.company_id || ["rejeitada", "pago", "concluida"].includes(request.status)) throw new Error("Este pedido não está disponível para encerramento.");
      const ids = requestEntryIds(request.allocation_details).sort();
      const entries = await tx.financeEntry.findMany({ where: { id: { in: ids } }, include: { compensacao: true, payments: { where: { reversed_at: null, estorno_of_id: null } } } });
      if (!ids.length || entries.length !== ids.length || entries.some(e => (request.type === "pagamento_fornecedor" && e.type !== "despesa") || e.type !== entries[0].type || e.party_type !== "fornecedor" || e.party_id !== request.company_id || e.reversed_at || e.status !== "pago" || financeBalance(e) > 0)) throw new Error("Ainda existe saldo pendente ou lançamento incompatível neste pedido.");
      await tx.changeRequest.update({ where: { id }, data: { status: "concluida", reviewed_by_id: actor.id, reviewed_at: new Date(), response_note: "Pedido encerrado. O saldo já foi liquidado no financeiro.", allocation_details: { ...(request.allocation_details as Prisma.JsonObject), payment_ids: entries.flatMap(e => e.payments.map(p => p.id)) } } });
      await tx.auditLog.create({ data: { actor_id: actor.id, action: "pedido_fornecedor_quitado_encerrado", entity_type: "change_request", entity_id: id, metadata: { entryIds: ids } } });
    });
    revalidatePath("/admin/solicitacoes"); revalidatePath("/portal/empresa/financeiro");
    return { error: null };
  } catch (error) { unstable_rethrow(error); return { error: error instanceof Error ? error.message : "Não foi possível encerrar o pedido." }; }
}
