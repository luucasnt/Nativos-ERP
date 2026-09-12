import "server-only";
import { prisma } from "@/lib/prisma";

// Gera o próximo código de reserva no formato RES-{ano}-{sequencial}, como
// usado nos dados de seed (RES-2026-000001).
export async function generateNextReservationCode() {
  const year = new Date().getFullYear();
  const prefix = `RES-${year}-`;

  const last = await prisma.reservation.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });

  const lastSeq = last ? Number(last.code.slice(prefix.length)) : 0;
  const nextSeq = lastSeq + 1;

  return `${prefix}${String(nextSeq).padStart(6, "0")}`;
}
