import { redirect } from "next/navigation";
import { AppShell } from "@/components/brand/app-shell";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { tableClass, tdClass, thClass } from "@/lib/ui";
import { ServiceExecutionActions } from "@/components/portal/service-execution-actions";
import { ServiceAcceptanceActions } from "@/components/portal/service-acceptance-actions";
import { DirectCollectionActions } from "@/components/portal/direct-collection-actions";
import { DriverRegistrationForm } from "@/components/portal/driver-registration-form";
import { VehicleRegistrationForm } from "@/components/portal/vehicle-registration-form";
import { FinanceExtractTable } from "@/components/portal/finance-extract-table";
import { NotificationBell } from "@/components/portal/notification-bell";
import { NovaReservaRequestForm } from "@/components/portal/nova-reserva-request-form";
import { ReservationRequestForm } from "@/components/portal/reservation-request-form";
import { RepasseRequestForm } from "@/components/portal/repasse-request-form";
import { ChangeRequestsTable } from "@/components/portal/change-requests-table";
import { getUnreadNotifications } from "@/lib/notifications";
import { getPartyFinanceExtract } from "@/lib/finance/party-extract";
import { RESERVATION_STATUS_LABEL } from "@/lib/reservations/status-labels";
import {
  confirmNotReceivedPortalEmpresa,
  confirmReceivedPortalEmpresa,
  submitAlteracaoRequest,
  submitCancelamentoRequest,
  submitRepasseRequestEmpresa,
} from "./actions";

export default async function PortalEmpresaHomePage() {
  const user = await getCurrentUser();

  if (!user || user.account_type !== "portal" || !user.linked_company) {
    redirect("/login");
  }

  const { linked_company: company } = user;
  const roleLabels = company.roles
    .map((role) => (role === "parceiro" ? "Parceiro" : "Fornecedor"))
    .join(" · ");

  const isFornecedor = company.roles.includes("fornecedor");
  const isParceiro = company.roles.includes("parceiro");

  const [
    notifications,
    pendingAcceptance,
    services,
    servicesAwaitingCollection,
    notReceivedReasons,
    drivers,
    vehicles,
    vehicleCategories,
    extract,
    reservationsAsPartner,
    changeRequests,
    repasseEligibleEntries,
  ] = await Promise.all([
    getUnreadNotifications(user.id),
    isFornecedor
      ? prisma.service.findMany({
          where: { supplier_id: company.id, acceptance_status: "aguardando_aceite" },
          include: { reservation: true, driver: true },
          orderBy: { scheduled_date: "asc" },
        })
      : Promise.resolve([]),
    isFornecedor
      ? prisma.service.findMany({
          where: {
            supplier_id: company.id,
            acceptance_status: "aceito",
            execution_status: { in: ["agendado", "em_andamento"] },
          },
          include: { reservation: true, driver: true },
          orderBy: { scheduled_date: "asc" },
        })
      : Promise.resolve([]),
    isFornecedor
      ? prisma.service.findMany({
          where: {
            supplier_id: company.id,
            collection_actor: "fornecedor",
            execution_status: "concluido",
            direct_collections: { none: {} },
          },
          include: { reservation: true },
          orderBy: { scheduled_date: "desc" },
        })
      : Promise.resolve([]),
    isFornecedor
      ? prisma.catalogItem.findMany({ where: { type: "motivo_perda", active: true }, orderBy: { order: "asc" } })
      : Promise.resolve([]),
    isFornecedor
      ? prisma.driver.findMany({ where: { supplier_id: company.id }, orderBy: { created_at: "desc" } })
      : Promise.resolve([]),
    isFornecedor
      ? prisma.vehicle.findMany({ where: { supplier_id: company.id }, orderBy: { created_at: "desc" } })
      : Promise.resolve([]),
    isFornecedor
      ? prisma.catalogItem.findMany({ where: { type: "tipo_veiculo", active: true }, orderBy: { order: "asc" } })
      : Promise.resolve([]),
    isFornecedor
      ? getPartyFinanceExtract("fornecedor", company.id)
      : isParceiro
        ? getPartyFinanceExtract("parceiro", company.id)
        : Promise.resolve([]),
    isParceiro
      ? prisma.reservation.findMany({
          where: { origin_partner_id: company.id },
          include: { client: true, _count: { select: { services: true } } },
          orderBy: { created_at: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
    prisma.changeRequest.findMany({
      where: { requester_type: "company", requester_id: company.id },
      orderBy: { created_at: "desc" },
      take: 30,
    }),
    isFornecedor
      ? prisma.financeEntry.findMany({
          where: { party_type: "fornecedor", party_id: company.id, status: "pendente", payment_eligible: true },
          orderBy: { created_at: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const dedupeKeyNovaReserva = crypto.randomUUID();
  const dedupeKeyAlteracao = crypto.randomUUID();
  const dedupeKeyCancelamento = crypto.randomUUID();
  const dedupeKeyRepasse = crypto.randomUUID();

  return (
    <AppShell
      title="Portal do parceiro / fornecedor"
      userName={user.display_name ?? company.name}
      notifications={<NotificationBell notifications={notifications} />}
    >
      <h1 className="font-serif text-3xl text-forest">{company.name}</h1>
      <p className="mt-2 text-forest/70">{roleLabels}</p>

      {isParceiro && (
        <>
          <h2 className="mt-8 mb-3 font-serif text-xl text-forest">Minhas reservas</h2>
          {reservationsAsPartner.length === 0 ? (
            <p className="text-sm text-forest/60">Nenhuma reserva vinculada a você ainda.</p>
          ) : (
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Código</th>
                  <th className={thClass}>Cliente</th>
                  <th className={thClass}>Serviços</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody>
                {reservationsAsPartner.map((r) => (
                  <tr key={r.id}>
                    <td className={tdClass}>{r.code}</td>
                    <td className={tdClass}>{r.client.name}</td>
                    <td className={tdClass}>{r._count.services}</td>
                    <td className={tdClass}>{RESERVATION_STATUS_LABEL[r.status]}</td>
                    <td className={tdClass}>
                      <a href={`/api/documentos/voucher/${r.id}`} target="_blank" rel="noreferrer" className="text-forest underline decoration-gold hover:text-forest-light">
                        Voucher
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 className="mt-8 mb-3 font-serif text-xl text-forest">Solicitar nova reserva</h2>
          <NovaReservaRequestForm dedupeKey={dedupeKeyNovaReserva} />

          <h2 className="mt-8 mb-3 font-serif text-xl text-forest">Solicitar alteração</h2>
          <ReservationRequestForm
            dedupeKey={dedupeKeyAlteracao}
            reservations={reservationsAsPartner}
            action={submitAlteracaoRequest}
            reasonFieldName="descricao"
            reasonLabel="O que precisa mudar?"
            submitLabel="Solicitar alteração"
          />

          <h2 className="mt-8 mb-3 font-serif text-xl text-forest">Solicitar cancelamento</h2>
          <ReservationRequestForm
            dedupeKey={dedupeKeyCancelamento}
            reservations={reservationsAsPartner}
            action={submitCancelamentoRequest}
            reasonFieldName="motivo"
            reasonLabel="Motivo do cancelamento"
            submitLabel="Solicitar cancelamento"
          />
        </>
      )}

      {isFornecedor && (
        <>
          <h2 className="mt-8 mb-3 font-serif text-xl text-forest">
            Serviços aguardando sua confirmação
          </h2>
          {pendingAcceptance.length === 0 ? (
            <p className="text-sm text-forest/60">Nenhum serviço aguardando resposta.</p>
          ) : (
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Reserva</th>
                  <th className={thClass}>Motorista</th>
                  <th className={thClass}>Tipo</th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody>
                {pendingAcceptance.map((s) => (
                  <tr key={s.id}>
                    <td className={tdClass}>{s.reservation.code}</td>
                    <td className={tdClass}>{s.driver?.name ?? "—"}</td>
                    <td className={tdClass}>{s.type}</td>
                    <td className={tdClass}>
                      <ServiceAcceptanceActions serviceId={s.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 className="mt-8 mb-3 font-serif text-xl text-forest">
            Serviços dos meus motoristas
          </h2>
          <p className="mb-3 max-w-2xl text-sm text-forest/60">
            Como responsável pela empresa fornecedora, você pode iniciar e
            finalizar serviços atribuídos a qualquer motorista cadastrado sob
            ela, não só os que você mesmo dirige.
          </p>
          {services.length === 0 ? (
            <p className="text-sm text-forest/60">Nenhum serviço agendado no momento.</p>
          ) : (
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Reserva</th>
                  <th className={thClass}>Motorista</th>
                  <th className={thClass}>Tipo</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td className={tdClass}>{s.reservation.code}</td>
                    <td className={tdClass}>{s.driver?.name ?? "—"}</td>
                    <td className={tdClass}>{s.type}</td>
                    <td className={tdClass}>{s.execution_status}</td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        <ServiceExecutionActions
                          serviceId={s.id}
                          executionStatus={s.execution_status}
                        />
                        <a href={`/api/documentos/os/${s.id}`} target="_blank" rel="noreferrer" className="text-forest underline decoration-gold hover:text-forest-light">
                          OS
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 className="mt-8 mb-3 font-serif text-xl text-forest">
            Confirmação de recebimento direto
          </h2>
          <p className="mb-3 max-w-2xl text-sm text-forest/60">
            Serviços concluídos em que o passageiro paga direto à sua empresa
            — confirme se o valor foi recebido.
          </p>
          {servicesAwaitingCollection.length === 0 ? (
            <p className="text-sm text-forest/60">Nenhuma confirmação pendente.</p>
          ) : (
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Reserva</th>
                  <th className={thClass}>Tipo</th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody>
                {servicesAwaitingCollection.map((s) => (
                  <tr key={s.id}>
                    <td className={tdClass}>{s.reservation.code}</td>
                    <td className={tdClass}>{s.type}</td>
                    <td className={tdClass}>
                      <DirectCollectionActions
                        serviceId={s.id}
                        reasons={notReceivedReasons}
                        onConfirmReceived={confirmReceivedPortalEmpresa}
                        onConfirmNotReceived={confirmNotReceivedPortalEmpresa}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 className="mt-8 mb-3 font-serif text-xl text-forest">Meus motoristas</h2>
          {drivers.length === 0 ? (
            <p className="mb-3 text-sm text-forest/60">Nenhum motorista cadastrado ainda.</p>
          ) : (
            <table className={`${tableClass} mb-4`}>
              <thead>
                <tr>
                  <th className={thClass}>Nome</th>
                  <th className={thClass}>Aprovação</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id}>
                    <td className={tdClass}>{d.name}</td>
                    <td className={tdClass}>{d.approval_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <DriverRegistrationForm />

          <h2 className="mt-8 mb-3 font-serif text-xl text-forest">Meus veículos</h2>
          {vehicles.length === 0 ? (
            <p className="mb-3 text-sm text-forest/60">Nenhum veículo cadastrado ainda.</p>
          ) : (
            <table className={`${tableClass} mb-4`}>
              <thead>
                <tr>
                  <th className={thClass}>Placa</th>
                  <th className={thClass}>Modelo</th>
                  <th className={thClass}>Aprovação</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td className={tdClass}>{v.plate}</td>
                    <td className={tdClass}>{v.model}</td>
                    <td className={tdClass}>{v.approval_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <VehicleRegistrationForm categories={vehicleCategories} />

          <h2 className="mt-8 mb-3 font-serif text-xl text-forest">Solicitar repasse</h2>
          <RepasseRequestForm
            dedupeKey={dedupeKeyRepasse}
            entries={repasseEligibleEntries.map((e) => ({
              id: e.id,
              label: `${e.category} — R$ ${Number(e.amount).toFixed(2)}`,
            }))}
            action={submitRepasseRequestEmpresa}
          />
        </>
      )}

      {(isFornecedor || isParceiro) && (
        <>
          <h2 className="mt-8 mb-3 font-serif text-xl text-forest">Minhas solicitações</h2>
          <ChangeRequestsTable requests={changeRequests} />

          <h2 className="mt-8 mb-3 font-serif text-xl text-forest">Extrato financeiro</h2>
          <FinanceExtractTable entries={extract} />
        </>
      )}
    </AppShell>
  );
}
