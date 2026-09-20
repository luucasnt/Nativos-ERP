import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

export default async function AprovacoesPage() {
  const [drivers, vehicles] = await Promise.all([
    prisma.driver.findMany({
      where: { approval_status: "pendente" },
      include: { supplier: true },
      orderBy: { created_at: "asc" },
      take: 100,
    }),
    prisma.vehicle.findMany({
      where: { approval_status: "pendente" },
      include: { supplier: true },
      orderBy: { created_at: "asc" },
      take: 100,
    }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-serif text-3xl text-forest">Aprovações pendentes</h1>
        <p className="mt-2 text-forest/60">
          Cadastros enviados por fornecedores pelo portal externo, aguardando
          revisão da equipe interna.
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-serif text-xl text-forest">Motoristas</h2>
        {drivers.length === 0 ? (
          <p className="text-sm text-forest/60">Nenhum motorista pendente.</p>
        ) : (
          <>
            <ul className="grid gap-3 xl:hidden">
              {drivers.map((driver) => (
                <li key={driver.id} className="surface-panel p-4">
                  <p className="text-sm font-semibold text-ink">{driver.name}</p>
                  <p className="mt-1 text-xs text-forest/60">{driver.supplier?.name ?? "Sem fornecedor"}</p>
                  <Link href={`/admin/motoristas/${driver.id}`} className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-forest/15 text-sm font-semibold text-forest">Revisar motorista</Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto scrollbar-clean xl:block">
              <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Nome</th>
                <th className={thClass}>Fornecedor</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id}>
                  <td className={tdClass}>{d.name}</td>
                  <td className={tdClass}>{d.supplier?.name ?? "—"}</td>
                  <td className={tdClass}>
                    <Link href={`/admin/motoristas/${d.id}`} className={linkClass}>
                      Revisar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl text-forest">Veículos</h2>
        {vehicles.length === 0 ? (
          <p className="text-sm text-forest/60">Nenhum veículo pendente.</p>
        ) : (
          <>
            <ul className="grid gap-3 xl:hidden">
              {vehicles.map((vehicle) => (
                <li key={vehicle.id} className="surface-panel p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.08em] text-forest">{vehicle.plate}</p>
                  <p className="mt-1 text-sm text-ink">{vehicle.model}</p>
                  <p className="mt-1 text-xs text-forest/60">{vehicle.supplier?.name ?? "Sem fornecedor"}</p>
                  <Link href={`/admin/veiculos/${vehicle.id}`} className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-forest/15 text-sm font-semibold text-forest">Revisar veículo</Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto scrollbar-clean xl:block">
              <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Placa</th>
                <th className={thClass}>Modelo</th>
                <th className={thClass}>Fornecedor</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td className={tdClass}>{v.plate}</td>
                  <td className={tdClass}>{v.model}</td>
                  <td className={tdClass}>{v.supplier?.name ?? "—"}</td>
                  <td className={tdClass}>
                    <Link href={`/admin/veiculos/${v.id}`} className={linkClass}>
                      Revisar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
