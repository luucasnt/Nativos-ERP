import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

export default async function ClientesPage() {
  const clients = await prisma.client.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      document: true,
      origin: true,
      origin_partner: { select: { name: true } },
    },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="font-serif text-3xl text-forest">Clientes</h1>
        <Link href="/admin/clientes/novo" className={buttonClass}>
          Novo cliente
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="text-forest/60">Nenhum cliente cadastrado ainda.</p>
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {clients.map((client) => (
              <li key={client.id} className="surface-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{client.name}</p>
                    <p className="mt-1 text-xs text-forest/48">{client.document ?? "Documento não informado"}</p>
                  </div>
                  <span className="rounded-full bg-forest/[0.07] px-2.5 py-1 text-[10px] font-semibold text-forest/65">
                    {client.origin === "proprio" ? "Próprio" : "Parceiro"}
                  </span>
                </div>
                <p className="mt-3 text-xs text-forest/52">
                  Parceiro: <strong className="font-medium text-forest">{client.origin_partner?.name ?? "—"}</strong>
                </p>
                <Link
                  href={`/admin/clientes/${client.id}`}
                  className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-forest/15 text-sm font-semibold text-forest active:bg-forest/5"
                >
                  Abrir cadastro
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto md:block">
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
        </>
      )}
    </div>
  );
}
