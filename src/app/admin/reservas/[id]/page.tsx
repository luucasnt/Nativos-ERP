import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateReservation } from "../actions";
import { ReservationForm } from "../reservation-form";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";
import { RESERVATION_STATUS_LABEL } from "@/lib/reservations/status-labels";

const acceptanceLabel: Record<string, string> = {
  aguardando_aceite: "Aguardando aceite",
  aceito: "Aceito",
  recusado: "Recusado",
};

const executionLabel: Record<string, string> = {
  agendado: "Agendado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export default async function ReservaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [reservation, clients, partners, companies, drivers] = await Promise.all([
    prisma.reservation.findUnique({
      where: { id },
      include: { services: { orderBy: { created_at: "asc" } } },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.company.findMany({
      where: { roles: { has: "parceiro" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.driver.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!reservation) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-serif text-3xl text-forest">{reservation.code}</h1>
        <p className="mt-1 text-sm text-forest/60">
          Status calculado automaticamente:{" "}
          <strong>{RESERVATION_STATUS_LABEL[reservation.status]}</strong>
          {reservation.has_partial_cancellation && (
            <span className="ml-2 rounded-sm bg-gold/20 px-1.5 py-0.5 text-xs text-forest">
              parcialmente cancelada
            </span>
          )}
        </p>
        {reservation.requires_nf && (
          <p className="mt-1 text-sm text-forest/60">
            {reservation.tax_percent_snapshot === null ? (
              <>NF: nenhuma alíquota definida ainda — informe uma abaixo ou em Configurações &gt; Impostos.</>
            ) : (
              <>
                NF: R$ {reservation.nf_value?.toString() ?? "0"} · Imposto (
                {reservation.tax_percent_snapshot.toString()}%): R${" "}
                {reservation.tax_amount?.toString() ?? "0"}
              </>
            )}
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-4 font-serif text-xl text-forest">Dados da reserva</h2>
        <ReservationForm
          action={updateReservation.bind(null, id)}
          clients={clients}
          partners={partners}
          companies={companies}
          drivers={drivers}
          cancelHref="/admin/reservas"
          defaultValues={{
            client_id: reservation.client_id,
            origin_partner_id: reservation.origin_partner_id,
            referrer_type: reservation.referrer_type,
            referrer_id: reservation.referrer_id,
            referrer_name: reservation.referrer_name,
            referrer_document: reservation.referrer_document,
            commission_percent: reservation.commission_percent?.toString() ?? null,
            is_cortesia: reservation.is_cortesia,
            is_net_fare: reservation.is_net_fare,
            requires_nf: reservation.requires_nf,
            collection_mode: reservation.collection_mode,
            tax_percent_snapshot: reservation.tax_percent_snapshot?.toString() ?? null,
          }}
        />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl text-forest">Serviços</h2>
          <Link href={`/admin/reservas/${id}/servicos/novo`} className={buttonClass}>
            Adicionar serviço
          </Link>
        </div>

        {reservation.services.length === 0 ? (
          <p className="text-sm text-forest/60">Nenhum serviço adicionado ainda.</p>
        ) : (
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Tipo</th>
                <th className={thClass}>Execução</th>
                <th className={thClass}>Valor</th>
                <th className={thClass}>Aceite</th>
                <th className={thClass}>Execução (status)</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {reservation.services.map((s) => (
                <tr key={s.id}>
                  <td className={tdClass}>{s.type}</td>
                  <td className={tdClass}>
                    {s.execution_type === "propria" ? "Própria" : "Fornecedor"}
                  </td>
                  <td className={tdClass}>R$ {s.price.toString()}</td>
                  <td className={tdClass}>{acceptanceLabel[s.acceptance_status]}</td>
                  <td className={tdClass}>{executionLabel[s.execution_status]}</td>
                  <td className={tdClass}>
                    <Link href={`/admin/reservas/${id}/servicos/${s.id}`} className={linkClass}>
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
