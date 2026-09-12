import { prisma } from "@/lib/prisma";

// Gera o próximo protocolo no formato SOL-{ano}-{sequencial} (spec seção
// 7, ex.: SOL-2026-000123) — mesmo padrão de generateNextReservationCode.
export async function generateNextProtocol() {
  const year = new Date().getFullYear();
  const prefix = `SOL-${year}-`;

  const last = await prisma.changeRequest.findFirst({
    where: { protocol: { startsWith: prefix } },
    orderBy: { protocol: "desc" },
    select: { protocol: true },
  });

  const lastSeq = last ? Number(last.protocol.slice(prefix.length)) : 0;
  const nextSeq = lastSeq + 1;

  return `${prefix}${String(nextSeq).padStart(6, "0")}`;
}
