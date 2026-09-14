import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

export default async function MotoristasPage() {
  const drivers = await prisma.driver.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      owner_type: true,
      approval_status: true,
      status: true,
      is_company_owner_driver: true,
      supplier: { select: { name: true } },
    },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="font-serif text-3xl text-forest">Motoristas</h1>
        <Link href="/admin/motoristas/novo" className={buttonClass}>
          Novo motorista
        </Link>
      </div>

      {drivers.length === 0 ? (
        <p className="text-forest/60">Nenhum motorista cadastrado ainda.</p>
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {drivers.map((driver) => (
              <li key={driver.id} className="surface-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{driver.name}</p>
                    <p className="mt-1 text-xs text-forest/48">{driver.supplier?.name ?? "Operação Nativos"}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${driver.status === "ativo" ? "bg-success-light text-success" : "bg-forest/[0.07] text-forest/60"}`}>
                    {driver.status}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div><dt className="text-forest/43">Operação</dt><dd className="mt-1 font-medium text-forest">{driver.owner_type === "proprio" ? "Própria" : "Terceirizada"}</dd></div>
                  <div><dt className="text-forest/43">Aprovação</dt><dd className="mt-1 font-medium capitalize text-forest">{driver.approval_status}</dd></div>
                </dl>
                {driver.is_company_owner_driver && <p className="mt-3 text-[11px] font-medium text-[#856737]">Proprietário e motorista</p>}
                <Link href={`/admin/motoristas/${driver.id}`} className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-forest/15 text-sm font-semibold text-forest active:bg-forest/5">Abrir cadastro</Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto md:block">
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
        </>
      )}
    </div>
  );
}
