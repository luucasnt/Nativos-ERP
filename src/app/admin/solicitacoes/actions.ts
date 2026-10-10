"use server";

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
  const allocation = request.allocation_details as Record<string, unknown> | null;
  if (request.type === "repasse_nativos" && allocation?.origem === "cobranca_direta_fornecedor" && ["pago", "concluida"].includes(status)) {
    const ids = Array.isArray(allocation.entry_ids) ? allocation.entry_ids.filter((value): value is string => typeof value === "string") : [];
    if (!ids.length || await prisma.financeEntry.count({ where: { id: { in: ids }, party_id: request.company_id, party_type: "fornecedor", type: "receita", status: "pago" } }) !== ids.length) throw new Error("Confirme primeiro o recebimento vinculado no financeiro. Este protocolo não pode baixar valores por uma mudança de etapa.");
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
