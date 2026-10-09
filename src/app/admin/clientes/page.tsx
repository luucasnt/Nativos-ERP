import { getClientActivity, EMPTY_CLIENT_ACTIVITY } from "@/lib/clients/activity";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, inputClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string; vip?: string }> }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const vipOnly = params.vip === "1";
  const clients = await prisma.client.findMany({
    where: { ...(vipOnly ? { is_vip: true } : {}), ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { phone: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }, { document: { contains: query, mode: "insensitive" } }] } : {}) },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      document: true,
      origin: true,
      is_vip: true,
      origin_partner: { select: { name: true } },
    },
    take: 100,
  });

  const activities = await getClientActivity(clients.map((client) => client.id));

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="font-serif text-3xl text-forest">Clientes</h1>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><form className="flex flex-wrap gap-2"><input name="q" defaultValue={query} placeholder="Pesquisar cliente…" className={`${inputClass} min-w-0 flex-1 sm:w-64`} /><label className="flex items-center gap-1 whitespace-nowrap text-xs text-forest"><input type="checkbox" name="vip" value="1" defaultChecked={vipOnly} />Somente VIP</label><button className={buttonClass}>Buscar</button></form><Link href="/admin/clientes/novo" className={buttonClass}>Novo cliente</Link></div>
      </div>

      {clients.length === 0 ? (
        <p className="text-forest/60">Nenhum cliente cadastrado ainda.</p>
      ) : (
        <>
          <ul className="grid gap-3 xl:hidden">
            {clients.map((client) => (
              <li key={client.id} className="surface-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{client.name} {client.is_vip && <Badge tone="gold">VIP</Badge>}</p>
                    <p className="mt-1 text-xs text-forest/60">{client.document ?? "Documento não informado"}</p>
                  </div>
                  <span className="rounded-full bg-forest/[0.07] px-2.5 py-1 text-[11px] font-semibold text-forest/65">
                    {client.origin === "proprio" ? "Próprio" : "Parceiro"}
                  </span>
                </div>
                <p className="mt-3 text-xs text-forest/62">
                  Parceiro: <strong className="font-medium text-forest">{client.origin_partner?.name ?? "—"}</strong>
                </p>
                <p className="mt-3 text-xs text-forest/70">{activities.get(client.id)?.reservations ?? 0} reservas cadastradas · {activities.get(client.id)?.services ?? 0} serviços cadastrados · {activities.get(client.id)?.completedServices ?? 0} realizados</p>
                <Link
                  href={`/admin/clientes/${client.id}`}
                  className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-forest/15 text-sm font-semibold text-forest active:bg-forest/5"
                >
                  Abrir cadastro
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto scrollbar-clean xl:block">
            <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Nome</th>
                <th className={thClass}>Documento</th>
                <th className={thClass}>Origem</th>
                <th className={thClass}>Parceiro</th>
                <th className={thClass}>Reservas</th>
                <th className={thClass}>Serviços</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className={tdClass}>{c.name} {c.is_vip && <Badge tone="gold">VIP</Badge>}</td>
                  <td className={tdClass}>{c.document ?? "—"}</td>
                  <td className={tdClass}>
                    {c.origin === "proprio" ? "Próprio" : "Parceiro"}
                  </td>
                  <td className={tdClass}>{c.origin_partner?.name ?? "—"}</td>
                  <td className={tdClass}>{(activities.get(c.id) ?? EMPTY_CLIENT_ACTIVITY).reservations}<span className="block text-xs text-forest/55">{activities.get(c.id)?.completedReservations ?? 0} concluídas</span></td>
                  <td className={tdClass}>{(activities.get(c.id) ?? EMPTY_CLIENT_ACTIVITY).services}<span className="block text-xs text-forest/55">{activities.get(c.id)?.completedServices ?? 0} realizados</span></td>
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
