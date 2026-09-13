import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { ChangeRequestsTable } from "@/components/portal/change-requests-table";
import { requireCompanyPortalUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export default async function PortalEmpresaSolicitacoesPage() {
  const user = await requireCompanyPortalUser();
  const company = user.linked_company;

  const requests = await prisma.changeRequest.findMany({
    where: { requester_type: "company", requester_id: company.id },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Acompanhamento</p>
          <h1 className="page-heading mt-1">Minhas solicitações</h1>
          <p className="page-description">Consulte protocolos, respostas e o andamento de cada pedido.</p>
        </div>
        {company.roles.includes("parceiro") && (
          <Link
            href="/portal/empresa/reservas#nova-reserva"
            className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-cream hover:bg-forest-light"
          >
            Nova solicitação
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </header>

      <section className="surface-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
          <div>
            <h2 className="section-heading">Histórico</h2>
            <p className="mt-1 text-xs text-forest/46">Últimos {Math.min(requests.length, 100)} protocolos.</p>
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

