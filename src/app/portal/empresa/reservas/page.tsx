import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, FileText, Plus } from "lucide-react";
import { NovaReservaRequestForm } from "@/components/portal/nova-reserva-request-form";
import { ReservationRequestForm } from "@/components/portal/reservation-request-form";
import { Badge } from "@/components/ui/badge";
import { requireCompanyPortalUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { RESERVATION_STATUS_LABEL } from "@/lib/reservations/status-labels";
import {
  submitAlteracaoRequest,
  submitCancelamentoRequest,
} from "../actions";

function reservationTone(status: string): "success" | "warning" | "info" | "danger" | "neutral" {
  if (status === "confirmado" || status === "concluido") return "success";
  if (status === "pendente" || status === "rascunho") return "warning";
  if (status === "em_andamento") return "info";
  if (status === "cancelado" || status === "rejeitado") return "danger";
  return "neutral";
}

export default async function PortalEmpresaReservasPage() {
  const user = await requireCompanyPortalUser();
  const company = user.linked_company;

  if (!company.roles.includes("parceiro")) {
    redirect("/portal/empresa");
  }

  const reservations = await prisma.reservation.findMany({
    where: { origin_partner_id: company.id },
    include: { client: true, _count: { select: { services: true } } },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-[1360px] space-y-6">
      <header>
        <p className="eyebrow">Portal do parceiro</p>
        <h1 className="page-heading mt-1">Reservas</h1>
        <p className="page-description">Consulte documentos e envie novas solicitações à equipe Nativos.</p>
      </header>

      <section className="surface-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
          <div>
            <h2 className="section-heading">Minhas reservas</h2>
            <p className="mt-1 text-xs text-forest/46">{reservations.length} registros vinculados.</p>
          </div>
          <CalendarDays size={18} className="text-gold" aria-hidden="true" />
        </div>

        {reservations.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <CalendarDays size={30} className="mx-auto text-forest/22" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-forest">Nenhuma reserva ainda</p>
            <p className="mt-1 text-xs text-forest/46">Envie sua primeira solicitação abaixo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr>
                  <th className="bg-[#faf9f6] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Código</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Passageiro</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Serviços</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Criada em</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Status</th>
                  <th className="bg-[#faf9f6] px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Documento</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr key={reservation.id} className="border-t border-forest/[0.075] hover:bg-forest/[0.022]">
                    <td className="px-5 py-3.5 text-xs font-semibold text-forest">{reservation.code}</td>
                    <td className="px-4 py-3.5 text-xs text-ink">{reservation.client.name}</td>
                    <td className="px-4 py-3.5 text-xs text-forest/55">{reservation._count.services}</td>
                    <td className="px-4 py-3.5 text-xs text-forest/55">
                      {reservation.created_at.toLocaleDateString("pt-BR", { timeZone: "America/Bahia" })}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={reservationTone(reservation.status)}>
                        {RESERVATION_STATUS_LABEL[reservation.status]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <a
                        href={"/api/documentos/voucher/" + reservation.id}
                        target="_blank"
                        rel="noreferrer"
                        className="focus-ring inline-flex items-center gap-1 rounded text-xs font-semibold text-forest hover:text-forest-light"
                      >
                        <FileText size={13} aria-hidden="true" />
                        Voucher
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="nova-reserva" className="scroll-mt-24">
        <div className="mb-3 flex items-center gap-2">
          <Plus size={17} className="text-gold" aria-hidden="true" />
          <h2 className="section-heading">Enviar uma solicitação</h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <article className="surface-panel p-5">
            <h3 className="text-sm font-semibold text-forest">Nova reserva</h3>
            <p className="mb-4 mt-1 text-xs leading-5 text-forest/48">Informe o cliente e descreva o serviço desejado.</p>
            <NovaReservaRequestForm dedupeKey={crypto.randomUUID()} />
          </article>

          <article className="surface-panel p-5">
            <h3 className="text-sm font-semibold text-forest">Alterar reserva</h3>
            <p className="mb-4 mt-1 text-xs leading-5 text-forest/48">Solicite ajustes em uma reserva já criada.</p>
            <ReservationRequestForm
              dedupeKey={crypto.randomUUID()}
              reservations={reservations}
              action={submitAlteracaoRequest}
              reasonFieldName="descricao"
              reasonLabel="O que precisa mudar?"
              submitLabel="Solicitar alteração"
            />
          </article>

          <article className="surface-panel p-5">
            <h3 className="text-sm font-semibold text-forest">Cancelar reserva</h3>
            <p className="mb-4 mt-1 text-xs leading-5 text-forest/48">Envie o motivo para análise da equipe.</p>
            <ReservationRequestForm
              dedupeKey={crypto.randomUUID()}
              reservations={reservations}
              action={submitCancelamentoRequest}
              reasonFieldName="motivo"
              reasonLabel="Motivo do cancelamento"
              submitLabel="Solicitar cancelamento"
            />
          </article>
        </div>
      </section>

      <Link href="/portal/empresa/solicitacoes" className="focus-ring inline-flex items-center gap-1 rounded text-xs font-semibold text-forest">
        Acompanhar solicitações enviadas
        <ArrowRight size={13} aria-hidden="true" />
      </Link>
    </div>
  );
}

