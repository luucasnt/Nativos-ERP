import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateCompany } from "../actions";
import { CompanyForm } from "../company-form";
import { PortalLoginPanel } from "@/components/admin/portal-login-panel";

export default async function EditarEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [company, categories, existingUser] = await Promise.all([
    prisma.company.findUnique({ where: { id } }),
    prisma.catalogItem.findMany({
      where: { type: "categoria_fornecedor_parceiro", active: true },
      orderBy: { order: "asc" },
      select: { id: true, key: true, label: true },
    }),
    prisma.user.findFirst({ where: { linked_company_id: id } }),
  ]);

  if (!company) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">
        Editar empresa
      </h1>
      <CompanyForm
        action={updateCompany.bind(null, id)}
        categories={categories}
        defaultValues={{
          name: company.name,
          document: company.document,
          legal_person: company.legal_person,
          contact_name: company.contact_name,
          contact_email: company.contact_email,
          contact_phone: company.contact_phone,
          roles: company.roles,
          portal_email: company.portal_email,
          category_id: company.category_id,
          modelo_parceiro: company.modelo_parceiro,
          billing_enabled: company.billing_enabled,
          billing_limit: company.billing_limit?.toString() ?? null,
          closing_day: company.closing_day,
          invoice_due_day: company.invoice_due_day,
          requires_nf: company.requires_nf,
          net_enabled: company.net_enabled,
          commission_enabled: company.commission_enabled,
          commission: company.commission?.toString() ?? null,
          pix_key: company.pix_key,
          pix_key_type: company.pix_key_type,
          pix_favorecido_name: company.pix_favorecido_name,
          recebe_pagamento_direto: company.recebe_pagamento_direto,
          direct_collection_settlement_mode: company.direct_collection_settlement_mode,
          limite_inadimplencia: company.limite_inadimplencia?.toString() ?? null,
        }}
      />

      <div className="mt-10 max-w-2xl">
        <PortalLoginPanel
          kind="company"
          entityId={company.id}
          entityEmail={company.portal_email}
          existingUserId={existingUser?.id ?? null}
          existingUserEmail={existingUser?.email ?? null}
          existingUserStatus={existingUser?.status ?? null}
        />
      </div>
    </div>
  );
}
