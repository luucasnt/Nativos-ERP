import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

export default async function ComissoesPage() {
  const rules = await prisma.commissionDefault.findMany({
    orderBy: [{ target: "asc" }, { category_key: "asc" }],
  });

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="font-serif text-3xl text-forest">Comissões padrão</h1>
        <Link href="/admin/configuracoes/comissoes/nova" className={buttonClass}>
          Nova regra
        </Link>
      </div>
      <p className="mb-6 max-w-lg text-sm text-forest/60">
        Usadas só para pré-preencher o campo de comissão ao cadastrar uma
        nova empresa ou motorista — nunca sobrescrevem um valor já definido
        individualmente.
      </p>

      <div className="grid gap-3 md:hidden">
        {rules.map((rule) => <article key={rule.id} className="surface-panel p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-forest">{rule.target === "company" ? "Empresa" : "Motorista"}</p><p className="mt-1 text-xs text-forest/60">{rule.category_key}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rule.active ? "bg-success-light text-success" : "bg-forest/[0.06] text-forest/65"}`}>{rule.active ? "Ativa" : "Inativa"}</span></div><div className="mt-4 flex items-end justify-between"><div><span className="text-xs text-forest/60">Comissão</span><strong className="mt-1 block text-xl text-forest">{rule.commission_percent.toString()}%</strong></div><Link href={`/admin/configuracoes/comissoes/${rule.id}`} className={linkClass}>Editar regra</Link></div></article>)}
      </div>
      <div className="hidden max-w-full overflow-x-auto rounded-xl border border-forest/10 md:block">
      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>Alvo</th>
            <th className={thClass}>Categoria</th>
            <th className={thClass}>Comissão</th>
            <th className={thClass}>Status</th>
            <th className={thClass}></th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id}>
              <td className={tdClass}>{rule.target === "company" ? "Empresa" : "Motorista"}</td>
              <td className={tdClass}>{rule.category_key}</td>
              <td className={tdClass}>{rule.commission_percent.toString()}%</td>
              <td className={tdClass}>{rule.active ? "Ativa" : "Inativa"}</td>
              <td className={tdClass}>
                <Link href={`/admin/configuracoes/comissoes/${rule.id}`} className={linkClass}>
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
