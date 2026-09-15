import Link from "next/link";
import type { ChangeRequestStatus, Prisma } from "@prisma/client";
import { AlertTriangle, Clock3, Filter, Inbox, Search } from "lucide-react";
import { ChangeRequestReviewActions } from "@/components/admin/change-request-review-actions";
import { Badge } from "@/components/ui/badge";
import { SectionNavigation } from "@/components/ui/section-navigation";
import { isChangeRequestOverdue } from "@/lib/change-requests/sla";
import { prisma } from "@/lib/prisma";
import { inputClass, secondaryButtonClass } from "@/lib/ui";

const PAGE_SIZE = 25;
const TABS = [
  { key: "abertas", label: "Abertas", statuses: ["solicitada", "em_analise"] },
  { key: "aprovadas", label: "Aprovadas", statuses: ["aprovada", "aguardando_comprovante", "comprovante_em_analise", "pago"] },
  { key: "encerradas", label: "Encerradas", statuses: ["concluida", "rejeitada"] },
  { key: "todas", label: "Todas", statuses: null },
] as const;
const STATUS_LABEL: Record<string, string> = { solicitada: "Solicitada", em_analise: "Em análise", aprovada: "Aprovada", rejeitada: "Rejeitada", concluida: "Concluída", aguardando_comprovante: "Aguardando comprovante", comprovante_em_analise: "Comprovante em análise", pago: "Paga" };
const TYPE_LABEL: Record<string, string> = { nova_reserva: "Nova reserva", alteracao: "Alteração", cancelamento: "Cancelamento", pagamento_fatura: "Pagamento de fatura", repasse_nativos: "Repasse à Nativos", repasse_motorista: "Repasse ao motorista", contestacao_valor: "Contestação de valor", troca_recurso: "Troca de recurso", cadastro_motorista: "Cadastro de motorista", cadastro_veiculo: "Cadastro de veículo", correcao_horario: "Correção de horário", correcao_informacao: "Correção de informação", antecipacao_fatura: "Antecipação de fatura", outro: "Outro" };
type Params = { tab?: string; q?: string; categoria?: string; page?: string };

function href(params: Params, changes: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...changes })) if (value) search.set(key, value);
  return `/admin/solicitacoes?${search.toString()}`;
}
function tone(status: ChangeRequestStatus): "success" | "warning" | "danger" | "info" | "neutral" {
  if (["concluida", "pago"].includes(status)) return "success";
  if (status === "rejeitada") return "danger";
  if (["solicitada", "aguardando_comprovante"].includes(status)) return "warning";
  if (["em_analise", "comprovante_em_analise"].includes(status)) return "info";
  return "neutral";
}
function details(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).map(([key, item]) => ({ label: key.replaceAll("_", " "), value: typeof item === "string" || typeof item === "number" ? String(item) : JSON.stringify(item) }));
}

export default async function SolicitacoesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const tab = TABS.find((item) => item.key === params.tab) ?? TABS[0];
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const matchingDrivers = query ? await prisma.driver.findMany({ where: { name: { contains: query, mode: "insensitive" } }, select: { id: true } }) : [];
  const where: Prisma.ChangeRequestWhereInput = {
    ...(tab.statuses ? { status: { in: [...tab.statuses] } } : {}),
    ...(params.categoria === "operacional" || params.categoria === "financeiro" ? { category: params.categoria } : {}),
    ...(query ? { OR: [
      { protocol: { contains: query, mode: "insensitive" } },
      { company: { is: { name: { contains: query, mode: "insensitive" } } } },
      { reservation: { is: { code: { contains: query, mode: "insensitive" } } } },
      ...(matchingDrivers.length ? [{ requester_id: { in: matchingDrivers.map((driver) => driver.id) } }] : []),
    ] } : {}),
  };
  const [groups, total, requests] = await Promise.all([
    prisma.changeRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.changeRequest.count({ where }),
    prisma.changeRequest.findMany({ where, include: { company: true, reservation: { select: { id: true, code: true } } }, orderBy: [{ created_at: "desc" }, { id: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const driverIds = requests.filter((request) => request.requester_type === "driver").map((request) => request.requester_id);
  const drivers = driverIds.length ? await prisma.driver.findMany({ where: { id: { in: driverIds } }, select: { id: true, name: true } }) : [];
  const driverNames = new Map(drivers.map((driver) => [driver.id, driver.name]));
  const counts = new Map(groups.map((group) => [group.status, group._count._all]));
  const tabCount = (item: (typeof TABS)[number]) => item.statuses ? item.statuses.reduce((sum, status) => sum + (counts.get(status) ?? 0), 0) : groups.reduce((sum, group) => sum + group._count._all, 0);
  const now = new Date();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return <div className="mx-auto max-w-[1280px] space-y-5">
    <header><p className="eyebrow">Central de decisões</p><h1 className="page-heading mt-1">Solicitações</h1><p className="page-description">Analise pedidos dos portais com prioridade, contexto e histórico de resposta.</p></header>
    <SectionNavigation
      activeKey={tab.key}
      ariaLabel="Etapas das solicitações"
      mobileLabel="Mostrar solicitações"
      items={TABS.map((item) => ({
        key: item.key,
        label: item.label,
        count: tabCount(item),
        href: href(params, { tab: item.key, page: undefined }),
      }))}
    />
    <form className="surface-panel grid gap-3 p-4 md:grid-cols-[minmax(240px,1fr)_200px_auto]" action="/admin/solicitacoes" method="get"><input type="hidden" name="tab" value={tab.key} /><label className="relative"><span className="sr-only">Buscar solicitação</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forest/55" /><input name="q" defaultValue={query} placeholder="Protocolo, reserva ou solicitante" className={`${inputClass} pl-9`} /></label><select name="categoria" defaultValue={params.categoria ?? ""} className={inputClass}><option value="">Todas as áreas</option><option value="operacional">Operacional</option><option value="financeiro">Financeiro</option></select><button className={secondaryButtonClass}><Filter size={15} /> Filtrar</button></form>

    {requests.length === 0 ? <section className="surface-panel py-14 text-center"><Inbox className="mx-auto text-forest/25" size={34} /><h2 className="mt-3 text-base font-semibold text-forest">Nenhuma solicitação encontrada</h2><p className="mt-1 text-sm text-forest/55">Não há itens nesta fila com os filtros atuais.</p></section> : <div className="grid gap-4 xl:grid-cols-2">{requests.map((request) => {
      const overdue = isChangeRequestOverdue({ createdAt: request.created_at, category: request.category, status: request.status, now });
      const requester = request.requester_type === "company" ? request.company?.name ?? "Empresa não localizada" : driverNames.get(request.requester_id) ?? "Motorista não localizado";
      const requestDetails = details(request.allocation_details);
      return <article key={request.id} className={`surface-panel overflow-hidden ${overdue ? "border-danger/25" : ""}`}>
        <div className="flex items-start justify-between gap-3 border-b border-forest/10 p-4"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-forest">{request.protocol}</strong><Badge tone={request.category === "financeiro" ? "info" : "neutral"}>{request.category === "financeiro" ? "Financeiro" : "Operacional"}</Badge></div><h2 className="mt-2 text-lg font-semibold text-ink">{TYPE_LABEL[request.type] ?? request.type.replaceAll("_", " ")}</h2></div><Badge tone={overdue ? "danger" : tone(request.status)}>{overdue ? "Fora do prazo" : STATUS_LABEL[request.status]}</Badge></div>
        <div className="grid gap-4 p-4 sm:grid-cols-[1fr_220px]"><div className="space-y-4"><dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 text-sm"><dt className="text-forest/60">Solicitante</dt><dd className="font-medium text-forest">{requester}</dd><dt className="text-forest/60">Reserva</dt><dd>{request.reservation ? <Link href={`/admin/reservas/${request.reservation.id}`} className="font-semibold text-forest underline-offset-4 hover:underline">{request.reservation.code}</Link> : "Não vinculada"}</dd><dt className="text-forest/60">Recebida</dt><dd className="text-forest/72">{request.created_at.toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" })}</dd></dl>
          {requestDetails.length > 0 && <div className="rounded-xl bg-forest/[0.045] p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-forest/60">Detalhes do pedido</p>{requestDetails.map((detail) => <p key={detail.label} className="mb-2 last:mb-0"><span className="block text-xs capitalize text-forest/60">{detail.label}</span><span className="text-sm leading-relaxed text-ink">{detail.value}</span></p>)}</div>}
          {request.type === "alteracao" && request.status === "aprovada" && request.reservation && <p className="rounded-lg border border-warning/20 bg-warning/[0.06] p-3 text-sm text-forest"><AlertTriangle size={15} className="mr-1 inline text-warning" />A aprovação autoriza a análise. Aplique a alteração na reserva e depois marque como concluída.</p>}
        </div><div><div className="mb-3 flex items-center gap-2 text-xs text-forest/60"><Clock3 size={14} /> Prazo: {request.category === "financeiro" ? "2 horas" : "30 minutos"}</div><ChangeRequestReviewActions id={request.id} currentStatus={request.status} /></div></div>
      </article>;
    })}</div>}
    <footer className="flex flex-col items-center justify-between gap-3 text-sm text-forest/55 sm:flex-row"><span>{total} itens · página {page} de {totalPages}</span><div className="flex gap-2">{page > 1 && <Link href={href(params, { page: String(page - 1) })} className={secondaryButtonClass}>Anterior</Link>}{page < totalPages && <Link href={href(params, { page: String(page + 1) })} className={secondaryButtonClass}>Próxima</Link>}</div></footer>
  </div>;
}
