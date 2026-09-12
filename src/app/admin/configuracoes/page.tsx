import Link from "next/link";

const sections = [
  {
    href: "/admin/configuracoes/catalogo",
    title: "Catálogo",
    description: "Categorias reutilizáveis: tipo de veículo, bagagem, cadeirinha, despesa, fornecedor/parceiro, forma de pagamento, motivo de perda, pacote de disposição, tipo de concierge.",
  },
  {
    href: "/admin/configuracoes/emails",
    title: "Templates de e-mail",
    description: "Assunto, corpo e variáveis de cada e-mail transacional, com disparo automático opcional.",
  },
  {
    href: "/admin/configuracoes/contratos",
    title: "Cláusulas de contrato",
    description: "Textos reutilizáveis na geração de contratos, por categoria e ordem.",
  },
  {
    href: "/admin/configuracoes/documentos",
    title: "Documentos",
    description: "Padrão de exibição de valor em voucher e ordem de serviço.",
  },
  {
    href: "/admin/configuracoes/impostos",
    title: "Impostos",
    description: "Alíquota padrão de imposto/NF — sem valor de fábrica, só o que você definir aqui.",
  },
  {
    href: "/admin/configuracoes/comissoes",
    title: "Comissões padrão",
    description: "Percentual de comissão sugerido ao cadastrar uma nova empresa ou motorista, por categoria.",
  },
  {
    href: "/admin/configuracoes/usuarios",
    title: "Usuários internos",
    description: "Criação e desativação de acessos da equipe (financeiro, operacional, proprietário).",
  },
];

export default function ConfiguracoesPage() {
  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">Configurações</h1>
      <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-sm border border-forest/10 bg-white p-4 transition hover:border-gold"
          >
            <h2 className="font-serif text-lg text-forest">{s.title}</h2>
            <p className="mt-1 text-sm text-forest/60">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
