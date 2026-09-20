import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

export default async function ContratosPage() {
  const clauses = await prisma.contractClause.findMany({
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="font-serif text-3xl text-forest">Cláusulas de contrato</h1>
        <Link href="/admin/configuracoes/contratos/novo" className={buttonClass}>
          Nova cláusula
        </Link>
      </div>

      <div className="grid gap-3 md:hidden">{clauses.map((clause) => <article key={clause.id} className="surface-panel p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#806538]">{clause.category}</p><h2 className="mt-1 text-sm font-semibold text-forest">{clause.title}</h2></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${clause.active ? "bg-success-light text-success" : "bg-forest/[0.06] text-forest/65"}`}>{clause.active ? "Ativa" : "Inativa"}</span></div><div className="mt-4 flex items-center justify-between"><span className="text-xs text-forest/60">Ordem {clause.order}</span><Link href={`/admin/configuracoes/contratos/${clause.id}`} className={linkClass}>Editar cláusula</Link></div></article>)}</div>
      <div className="hidden max-w-full overflow-x-auto scrollbar-clean rounded-xl border border-forest/10 md:block">
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
          {clauses.map((clause) => (
            <tr key={clause.id}>
              <td className={tdClass}>{clause.category}</td>
              <td className={tdClass}>{clause.order}</td>
              <td className={tdClass}>{clause.title}</td>
              <td className={tdClass}>{clause.active ? "Ativa" : "Inativa"}</td>
              <td className={tdClass}>
                <Link href={`/admin/configuracoes/contratos/${clause.id}`} className={linkClass}>
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
