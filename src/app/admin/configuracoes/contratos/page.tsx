import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

export default async function ContratosPage() {
  const clauses = await prisma.contractClause.findMany({
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Cláusulas de contrato</h1>
        <Link href="/admin/configuracoes/contratos/novo" className={buttonClass}>
          Nova cláusula
        </Link>
      </div>

      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>Categoria</th>
            <th className={thClass}>Ordem</th>
            <th className={thClass}>Título</th>
            <th className={thClass}>Status</th>
            <th className={thClass}></th>
          </tr>
        </thead>
        <tbody>
          {clauses.map((c) => (
            <tr key={c.id}>
              <td className={tdClass}>{c.category}</td>
              <td className={tdClass}>{c.order}</td>
              <td className={tdClass}>{c.title}</td>
              <td className={tdClass}>{c.active ? "Ativa" : "Inativa"}</td>
              <td className={tdClass}>
                <Link href={`/admin/configuracoes/contratos/${c.id}`} className={linkClass}>
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
