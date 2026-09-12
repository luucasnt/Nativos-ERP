import { redirect } from "next/navigation";
import { AppShell } from "@/components/brand/app-shell";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { tableClass, tdClass, thClass } from "@/lib/ui";
import { ServiceExecutionActions } from "@/components/portal/service-execution-actions";
import { ServiceAcceptanceActions } from "@/components/portal/service-acceptance-actions";

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

  const [pendingAcceptance, services] = isFornecedor
    ? await Promise.all([
        prisma.service.findMany({
          where: { supplier_id: company.id, acceptance_status: "aguardando_aceite" },
          include: { reservation: true, driver: true },
          orderBy: { scheduled_date: "asc" },
        }),
        prisma.service.findMany({
          where: {
            supplier_id: company.id,
            acceptance_status: "aceito",
            execution_status: { in: ["agendado", "em_andamento"] },
          },
          include: { reservation: true, driver: true },
          orderBy: { scheduled_date: "asc" },
        }),
      ])
    : [[], []];

  return (
    <AppShell
      title="Portal do parceiro / fornecedor"
      userName={user.display_name ?? company.name}
    >
      <h1 className="font-serif text-3xl text-forest">{company.name}</h1>
      <p className="mt-2 text-forest/70">{roleLabels}</p>

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
        </>
      )}
    </AppShell>
  );
}
