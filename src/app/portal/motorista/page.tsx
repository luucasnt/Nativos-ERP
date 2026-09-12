import { redirect } from "next/navigation";
import { AppShell } from "@/components/brand/app-shell";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { tableClass, tdClass, thClass } from "@/lib/ui";
import { ServiceExecutionActions } from "@/components/portal/service-execution-actions";

export default async function PortalMotoristaHomePage() {
  const user = await getCurrentUser();

  if (!user || user.account_type !== "portal" || !user.linked_driver) {
    redirect("/login");
  }

  const { linked_driver: driver } = user;

  const services = await prisma.service.findMany({
    where: {
      driver_id: driver.id,
      execution_status: { in: ["agendado", "em_andamento"] },
    },
    include: { reservation: true },
    orderBy: { scheduled_date: "asc" },
  });

  return (
    <AppShell
      title="Portal do motorista"
      userName={user.display_name ?? driver.name}
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
    </AppShell>
  );
}
