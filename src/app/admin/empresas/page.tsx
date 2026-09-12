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
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Empresas</h1>
        <Link href="/admin/empresas/novo" className={buttonClass}>
          Nova empresa
        </Link>
      </div>

      {companies.length === 0 ? (
        <p className="text-forest/60">Nenhuma empresa cadastrada ainda.</p>
      ) : (
        <div className="overflow-x-auto">
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
      )}
    </div>
  );
}
