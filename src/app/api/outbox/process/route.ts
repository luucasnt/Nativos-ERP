// Gatilho do outbox real (spec seção 8): processa um lote pendente/em
// retry do Communication. Nunca chamado inline por quem enfileira — só
// por um agendador externo (Vercel Cron, ver vercel.json) ou
// manualmente pelo botão em /admin/configuracoes/emails. Protegido por um
// segredo compartilhado (CRON_SECRET) para não ser disparável por
// qualquer um que descubra a URL.
import { NextResponse } from "next/server";
import { processOutboxOnce } from "@/lib/communication/outbox";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Processamento automático não configurado." },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const result = await processOutboxOnce();
  return NextResponse.json(result);
}

// Vercel Cron faz GET por padrão.
export async function GET(request: Request) {
  return POST(request);
}
