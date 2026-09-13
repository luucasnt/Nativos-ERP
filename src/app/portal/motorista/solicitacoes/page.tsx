import { Inbox } from "lucide-react";
import { ChangeRequestsTable } from "@/components/portal/change-requests-table";
import { requireDriverPortalUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export default async function PortalMotoristaSolicitacoesPage() {
  const user = await requireDriverPortalUser();
  const driver = user.linked_driver;

  const requests = await prisma.changeRequest.findMany({
    where: { requester_type: "driver", requester_id: driver.id },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <header>
        <p className="eyebrow">Acompanhamento</p>
        <h1 className="page-heading mt-1">Minhas solicitações</h1>
        <p className="page-description">Acompanhe protocolos de repasse e pedidos enviados à operação.</p>
      </header>

      <section className="surface-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
          <div>
            <h2 className="section-heading">Histórico</h2>
            <p className="mt-1 text-xs text-forest/46">{requests.length} solicitações encontradas.</p>
          </div>
          <Inbox size={18} className="text-gold" aria-hidden="true" />
        </div>
        <div className="p-4 md:p-5">
          <ChangeRequestsTable requests={requests} />
        </div>
      </section>
    </div>
  );
}

