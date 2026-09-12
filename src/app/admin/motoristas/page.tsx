import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

export default async function MotoristasPage() {
  const drivers = await prisma.driver.findMany({
    orderBy: { created_at: "desc" },
    include: { supplier: true },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Motoristas</h1>
        <Link href="/admin/motoristas/novo" className={buttonClass}>
          Novo motorista
        </Link>
      </div>

      {drivers.length === 0 ? (
        <p className="text-forest/60">Nenhum motorista cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Nome</th>
                <th className={thClass}>Tipo</th>
                <th className={thClass}>Fornecedor</th>
                <th className={thClass}>Aprovação</th>
                <th className={thClass}>Status</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id}>
                  <td className={tdClass}>
                    {d.name}
                    {d.is_company_owner_driver && (
                      <span className="ml-2 rounded-sm bg-gold/20 px-1.5 py-0.5 text-xs text-forest">
                        dono
                      </span>
                    )}
                  </td>
                  <td className={tdClass}>
                    {d.owner_type === "proprio" ? "Próprio" : "Terceirizado"}
                  </td>
                  <td className={tdClass}>{d.supplier?.name ?? "—"}</td>
                  <td className={tdClass}>{d.approval_status}</td>
                  <td className={tdClass}>{d.status}</td>
                  <td className={tdClass}>
                    <Link href={`/admin/motoristas/${d.id}`} className={linkClass}>
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
