import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

export default async function EmailTemplatesPage() {
  const templates = await prisma.emailTemplate.findMany({ orderBy: { key: "asc" } });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Templates de e-mail</h1>
        <Link href="/admin/configuracoes/emails/novo" className={buttonClass}>
          Novo template
        </Link>
      </div>

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
          {templates.map((t) => (
            <tr key={t.key}>
              <td className={tdClass}>{t.key}</td>
              <td className={tdClass}>{t.name}</td>
              <td className={tdClass}>{t.category}</td>
              <td className={tdClass}>{t.auto_send ? "Sim" : "Não"}</td>
              <td className={tdClass}>
                <Link href={`/admin/configuracoes/emails/${t.key}`} className={linkClass}>
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
