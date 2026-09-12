import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

export default async function ComissoesPage() {
  const rules = await prisma.commissionDefault.findMany({
    orderBy: [{ target: "asc" }, { category_key: "asc" }],
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
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
          {rules.map((r) => (
            <tr key={r.id}>
              <td className={tdClass}>{r.target === "company" ? "Empresa" : "Motorista"}</td>
              <td className={tdClass}>{r.category_key}</td>
              <td className={tdClass}>{r.commission_percent.toString()}%</td>
              <td className={tdClass}>{r.active ? "Ativa" : "Inativa"}</td>
              <td className={tdClass}>
                <Link href={`/admin/configuracoes/comissoes/${r.id}`} className={linkClass}>
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
