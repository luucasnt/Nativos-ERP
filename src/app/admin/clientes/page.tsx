import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

export default async function ClientesPage() {
  const clients = await prisma.client.findMany({
    orderBy: { created_at: "desc" },
    include: { origin_partner: true },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Clientes</h1>
        <Link href="/admin/clientes/novo" className={buttonClass}>
          Novo cliente
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="text-forest/60">Nenhum cliente cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Nome</th>
                <th className={thClass}>Documento</th>
                <th className={thClass}>Origem</th>
                <th className={thClass}>Parceiro</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className={tdClass}>{c.name}</td>
                  <td className={tdClass}>{c.document ?? "—"}</td>
                  <td className={tdClass}>
                    {c.origin === "proprio" ? "Próprio" : "Parceiro"}
                  </td>
                  <td className={tdClass}>{c.origin_partner?.name ?? "—"}</td>
                  <td className={tdClass}>
                    <Link href={`/admin/clientes/${c.id}`} className={linkClass}>
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
