import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

const roleLabel: Record<string, string> = {
  parceiro: "Parceiro",
  fornecedor: "Fornecedor",
};

export default async function EmpresasPage() {
  const companies = await prisma.company.findMany({
    orderBy: { created_at: "desc" },
    select: { id: true, name: true, roles: true, document: true, portal_email: true },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="font-serif text-3xl text-forest">Empresas</h1>
        <Link href="/admin/empresas/novo" className={buttonClass}>
          Nova empresa
        </Link>
      </div>

      {companies.length === 0 ? (
        <p className="text-forest/60">Nenhuma empresa cadastrada ainda.</p>
      ) : (
        <>
          <ul className="grid gap-3 xl:hidden">
            {companies.map((company) => (
              <li key={company.id} className="surface-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{company.name}</p>
                    <p className="mt-1 text-xs text-forest/60">{company.document ?? "Documento não informado"}</p>
                  </div>
                  <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-semibold text-[#856737]">
                    {company.roles.map((role) => roleLabel[role]).join(" + ")}
                  </span>
                </div>
                <p className="mt-3 truncate text-xs text-forest/62">Portal: <strong className="font-medium text-forest">{company.portal_email ?? "Não habilitado"}</strong></p>
                <Link href={`/admin/empresas/${company.id}`} className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-forest/15 text-sm font-semibold text-forest active:bg-forest/5">Abrir cadastro</Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto xl:block">
            <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Nome</th>
                <th className={thClass}>Papel</th>
                <th className={thClass}>Documento</th>
                <th className={thClass}>Portal</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td className={tdClass}>{c.name}</td>
                  <td className={tdClass}>
                    {c.roles.map((r) => roleLabel[r]).join(" · ")}
                  </td>
                  <td className={tdClass}>{c.document ?? "—"}</td>
                  <td className={tdClass}>{c.portal_email ?? "—"}</td>
                  <td className={tdClass}>
                    <Link href={`/admin/empresas/${c.id}`} className={linkClass}>
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
