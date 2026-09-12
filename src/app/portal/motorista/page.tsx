import { redirect } from "next/navigation";
import { AppShell } from "@/components/brand/app-shell";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { tableClass, tdClass, thClass } from "@/lib/ui";
import { ServiceExecutionActions } from "@/components/portal/service-execution-actions";
import { DirectCollectionActions } from "@/components/portal/direct-collection-actions";
import { ExpenseForm } from "@/components/portal/expense-form";
import { FinanceExtractTable } from "@/components/portal/finance-extract-table";
import { NotificationBell } from "@/components/portal/notification-bell";
import { RepasseRequestForm } from "@/components/portal/repasse-request-form";
import { ChangeRequestsTable } from "@/components/portal/change-requests-table";
import { getUnreadNotifications } from "@/lib/notifications";
import { getPartyFinanceExtract } from "@/lib/finance/party-extract";
import { SERVICE_EXPENSE_STATUS_LABEL } from "@/lib/finance/labels";
import { confirmNotReceivedPortal, confirmReceivedPortal, submitRepasseRequestMotorista } from "./actions";

export default async function PortalMotoristaHomePage() {
  const user = await getCurrentUser();

  if (!user || user.account_type !== "portal" || !user.linked_driver) {
    redirect("/login");
  }

  const { linked_driver: driver } = user;

  const [
    notifications,
    services,
    servicesAwaitingCollection,
    notReceivedReasons,
    expenseCategories,
    expenses,
    extract,
    changeRequests,
    repasseEligibleEntries,
  ] = await Promise.all([
    getUnreadNotifications(user.id),
    prisma.service.findMany({
      where: {
        driver_id: driver.id,
        execution_status: { in: ["agendado", "em_andamento"] },
      },
      include: { reservation: true },
      orderBy: { scheduled_date: "asc" },
    }),
    prisma.service.findMany({
      where: {
        driver_id: driver.id,
        collection_actor: "motorista_proprio",
        execution_status: "concluido",
        direct_collections: { none: {} },
      },
      include: { reservation: true },
      orderBy: { scheduled_date: "desc" },
    }),
    prisma.catalogItem.findMany({ where: { type: "motivo_perda", active: true }, orderBy: { order: "asc" } }),
    prisma.catalogItem.findMany({ where: { type: "categoria_despesa", active: true }, orderBy: { order: "asc" } }),
    prisma.serviceExpense.findMany({
      where: { driver_id: driver.id },
      include: { category: true, service: true },
      orderBy: { created_at: "desc" },
      take: 20,
    }),
    getPartyFinanceExtract("motorista", driver.id),
    prisma.changeRequest.findMany({
      where: { requester_type: "driver", requester_id: driver.id },
      orderBy: { created_at: "desc" },
      take: 30,
    }),
    prisma.financeEntry.findMany({
      where: { party_type: "motorista", party_id: driver.id, status: "pendente", payment_eligible: true },
      orderBy: { created_at: "desc" },
    }),
  ]);

  const completedServicesForExpense = await prisma.service.findMany({
    where: { driver_id: driver.id, execution_status: { in: ["em_andamento", "concluido"] } },
    include: { reservation: true },
    orderBy: { scheduled_date: "desc" },
    take: 30,
  });

  const dedupeKeyRepasse = crypto.randomUUID();

  return (
    <AppShell
      title="Portal do motorista"
      userName={user.display_name ?? driver.name}
      notifications={<NotificationBell notifications={notifications} />}
    >
      <h1 className="font-serif text-3xl text-forest">{driver.name}</h1>
      <p className="mt-2 text-forest/70">
        {driver.owner_type === "proprio" ? "Frota própria" : "Terceirizado"}
      </p>

      <h2 className="mt-8 mb-3 font-serif text-xl text-forest">
        Meus serviços
      </h2>
      {services.length === 0 ? (
        <p className="text-sm text-forest/60">Nenhum serviço agendado no momento.</p>
      ) : (
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Reserva</th>
              <th className={thClass}>Tipo</th>
              <th className={thClass}>Status</th>
              <th className={thClass}></th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td className={tdClass}>{s.reservation.code}</td>
                <td className={tdClass}>{s.type}</td>
                <td className={tdClass}>{s.execution_status}</td>
                <td className={tdClass}>
                  <ServiceExecutionActions
                    serviceId={s.id}
                    executionStatus={s.execution_status}
                  />
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
        Serviços concluídos em que o passageiro paga direto a você — confirme
        se o valor foi recebido.
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
                    onConfirmReceived={confirmReceivedPortal}
                    onConfirmNotReceived={confirmNotReceivedPortal}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="mt-8 mb-3 font-serif text-xl text-forest">Minhas despesas</h2>
      {expenses.length === 0 ? (
        <p className="mb-3 text-sm text-forest/60">Nenhuma despesa registrada ainda.</p>
      ) : (
        <table className={`${tableClass} mb-4`}>
          <thead>
            <tr>
              <th className={thClass}>Serviço</th>
              <th className={thClass}>Categoria</th>
              <th className={thClass}>Valor</th>
              <th className={thClass}>Status</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td className={tdClass}>{e.service.type}</td>
                <td className={tdClass}>{e.category.label}</td>
                <td className={tdClass}>
                  {Number(e.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td className={tdClass}>{SERVICE_EXPENSE_STATUS_LABEL[e.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ExpenseForm
        services={completedServicesForExpense.map((s) => ({
          id: s.id,
          label: `${s.reservation.code} — ${s.type}`,
        }))}
        categories={expenseCategories}
      />

      <h2 className="mt-8 mb-3 font-serif text-xl text-forest">Solicitar repasse</h2>
      <RepasseRequestForm
        dedupeKey={dedupeKeyRepasse}
        entries={repasseEligibleEntries.map((e) => ({
          id: e.id,
          label: `${e.category} — R$ ${Number(e.amount).toFixed(2)}`,
        }))}
        action={submitRepasseRequestMotorista}
      />

      <h2 className="mt-8 mb-3 font-serif text-xl text-forest">Minhas solicitações</h2>
      <ChangeRequestsTable requests={changeRequests} />

      <h2 className="mt-8 mb-3 font-serif text-xl text-forest">Extrato financeiro</h2>
      <FinanceExtractTable entries={extract} />
    </AppShell>
  );
}
