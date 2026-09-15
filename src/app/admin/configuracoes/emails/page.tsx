import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

export default async function EmailTemplatesPage() {
  const templates = await prisma.emailTemplate.findMany({ orderBy: { key: "asc" } });

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="font-serif text-3xl text-forest">Templates de e-mail</h1>
        <Link href="/admin/configuracoes/emails/novo" className={buttonClass}>
          Novo template
        </Link>
      </div>

      <div className="grid gap-3 md:hidden">{templates.map((template) => <article key={template.key} className="surface-panel p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-forest">{template.name}</p><p className="mt-1 truncate text-xs text-forest/60">{template.key}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${template.auto_send ? "bg-info-light text-info" : "bg-forest/[0.06] text-forest/65"}`}>{template.auto_send ? "Automático" : "Manual"}</span></div><div className="mt-4 flex items-center justify-between"><span className="text-xs text-forest/60">{template.category}</span><Link href={`/admin/configuracoes/emails/${template.key}`} className={linkClass}>Editar template</Link></div></article>)}</div>
      <div className="hidden max-w-full overflow-x-auto rounded-xl border border-forest/10 md:block">
      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>Chave</th>
            <th className={thClass}>Nome</th>
            <th className={thClass}>Categoria</th>
            <th className={thClass}>Auto-envio</th>
            <th className={thClass}></th>
          </tr>
        </thead>
        <tbody>
          {templates.map((template) => (
            <tr key={template.key}>
              <td className={tdClass}>{template.key}</td>
              <td className={tdClass}>{template.name}</td>
              <td className={tdClass}>{template.category}</td>
              <td className={tdClass}>{template.auto_send ? "Sim" : "Não"}</td>
              <td className={tdClass}>
                <Link href={`/admin/configuracoes/emails/${template.key}`} className={linkClass}>
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
