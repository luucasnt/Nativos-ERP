import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

export default async function VeiculosPage() {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { created_at: "desc" },
    include: { supplier: true, category: true },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Veículos</h1>
        <Link href="/admin/veiculos/novo" className={buttonClass}>
          Novo veículo
        </Link>
      </div>

      {vehicles.length === 0 ? (
        <p className="text-forest/60">Nenhum veículo cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto">
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
      )}
    </div>
  );
}
