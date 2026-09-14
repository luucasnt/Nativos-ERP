import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

export default async function VeiculosPage() {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      plate: true,
      model: true,
      approval_status: true,
      status: true,
      supplier: { select: { name: true } },
      category: { select: { label: true } },
      expense_policy: { select: { expected_km_per_liter: true, require_odometer: true } },
    },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="font-serif text-3xl text-forest">Veículos</h1>
        <Link href="/admin/veiculos/novo" className={buttonClass}>
          Novo veículo
        </Link>
      </div>

      {vehicles.length === 0 ? (
        <p className="text-forest/60">Nenhum veículo cadastrado ainda.</p>
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {vehicles.map((vehicle) => (
              <li key={vehicle.id} className="surface-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-[0.08em] text-forest">{vehicle.plate}</p>
                    <p className="mt-1 truncate text-sm font-medium text-ink">{vehicle.model}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${vehicle.status === "ativo" ? "bg-success-light text-success" : "bg-forest/[0.07] text-forest/60"}`}>
                    {vehicle.status}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div><dt className="text-forest/43">Categoria</dt><dd className="mt-1 font-medium text-forest">{vehicle.category?.label ?? "—"}</dd></div>
                  <div><dt className="text-forest/43">Aprovação</dt><dd className="mt-1 font-medium capitalize text-forest">{vehicle.approval_status}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-forest/52">Fornecedor: <strong className="font-medium text-forest">{vehicle.supplier?.name ?? "Nativos"}</strong></p>
                <p className="mt-2 text-xs text-forest/52">Controle: <strong className="font-medium text-forest">{vehicle.expense_policy ? `${Number(vehicle.expense_policy.expected_km_per_liter).toFixed(1)} km/l` : "parâmetros não definidos"}</strong></p>
                <Link href={`/admin/veiculos/${vehicle.id}`} className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-forest/15 text-sm font-semibold text-forest active:bg-forest/5">Abrir cadastro</Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto md:block">
            <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Placa</th>
                <th className={thClass}>Modelo</th>
                <th className={thClass}>Categoria</th>
                <th className={thClass}>Fornecedor</th>
                <th className={thClass}>Aprovação</th>
                <th className={thClass}>Status</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td className={tdClass}>{v.plate}</td>
                  <td className={tdClass}>{v.model}</td>
                  <td className={tdClass}>{v.category?.label ?? "—"}</td>
                  <td className={tdClass}>{v.supplier?.name ?? "—"}</td>
                  <td className={tdClass}>{v.approval_status}</td>
                  <td className={tdClass}>{v.status}</td>
                  <td className={tdClass}>
                    <Link href={`/admin/veiculos/${v.id}`} className={linkClass}>
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
