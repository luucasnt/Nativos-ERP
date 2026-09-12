// Autorização dos documentos gerados (Fase 7). Voucher e OS já têm um
// destinatário natural fora da equipe interna (o parceiro que originou a
// reserva; o motorista/fornecedor do serviço) — os outros 3 (recibo,
// contrato, orçamento) ficam só com a equipe interna por ora: são
// documentos tipicamente enviados por e-mail pelo admin, não baixados
// pelo próprio portal (ver README).
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function assertCanAccessReservationDocument(reservationId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (user.account_type === "internal") {
    return user;
  }

  const reservation = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });
  if (user.linked_company_id && reservation.origin_partner_id === user.linked_company_id) {
    return user;
  }

  throw new Error("Você não tem permissão para acessar este documento.");
}

export async function assertCanAccessServiceDocument(serviceId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (user.account_type === "internal") {
    return user;
  }

  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
  if (user.linked_driver_id && service.driver_id === user.linked_driver_id) {
    return user;
  }
  if (user.linked_company_id && service.supplier_id === user.linked_company_id) {
    return user;
  }

  throw new Error("Você não tem permissão para acessar este documento.");
}
