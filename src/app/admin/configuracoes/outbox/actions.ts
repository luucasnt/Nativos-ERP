"use server";

import { revalidatePath } from "next/cache";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { processOutboxOnce } from "@/lib/communication/outbox";

const PATH = "/admin/configuracoes/outbox";

// Em produção, o cron (vercel.json) chama /api/outbox/process
// periodicamente — este botão é só para reprocessar sob demanda (ex.:
// depois de configurar o RESEND_API_KEY, ou para não esperar o próximo
// disparo do cron).
export async function processOutboxNow() {
  await requireInternalUser();

  const result = await processOutboxOnce();

  revalidatePath(PATH);
  return result;
}
