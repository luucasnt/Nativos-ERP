import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

export default async function AprovacoesPage() {
  const [drivers, vehicles] = await Promise.all([
    prisma.driver.findMany({
      where: { approval_status: "pendente" },
      include: { supplier: true },
      orderBy: { created_at: "asc" },
    }),
    prisma.vehicle.findMany({
      where: { approval_status: "pendente" },
      include: { supplier: true },
      orderBy: { created_at: "asc" },
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
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl text-forest">Veículos</h2>
        {vehicles.length === 0 ? (
          <p className="text-sm text-forest/60">Nenhum veículo pendente.</p>
        ) : (
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
        )}
      </section>
    </div>
  );
}
