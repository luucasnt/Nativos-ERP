import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-current-user";

const sections = [
  {
    href: "/admin/configuracoes/empresa",
    group: "Empresa e operação",
    title: "Dados da Nativos",
    description: "Nome, documento, contatos, endereço, site e rodapé usados nos documentos e comunicações.",
  },
  {
    href: "/admin/configuracoes/operacao",
    group: "Empresa e operação",
    title: "Parâmetros da operação",
    description: "Espera, no-show, intervalo entre serviços, hora excedente e vencimento padrão.",
  },
  {
    href: "/admin/configuracoes/bancos",
    group: "Empresa e operação",
    title: "Contas bancárias e caixa",
    description: "Contas usadas em pagamentos, recebimentos, comprovantes e fechamentos de caixa.",
  },
  {
    href: "/admin/configuracoes/catalogo",
    group: "Cadastros e documentos",
    title: "Catálogo",
    description: "Categorias reutilizáveis: tipo de veículo, bagagem, cadeirinha, despesa, fornecedor/parceiro, forma de pagamento, motivo de perda, pacote de disposição, tipo de concierge.",
  },
  {
    href: "/admin/configuracoes/emails",
    group: "Comunicação",
    title: "Templates de e-mail",
    description: "Assunto, corpo e variáveis de cada e-mail transacional, com disparo automático opcional.",
  },
  {
    href: "/admin/configuracoes/outbox",
    group: "Comunicação",
    title: "Fila de e-mail (outbox)",
    description: "Log do que foi enfileirado, enviado ou falhou no envio real via Resend, com reprocessamento manual.",
  },
  {
    href: "/admin/configuracoes/contratos",
    group: "Cadastros e documentos",
    title: "Cláusulas de contrato",
    description: "Textos reutilizáveis na geração de contratos, por categoria e ordem.",
  },
  {
    href: "/admin/configuracoes/documentos",
    group: "Cadastros e documentos",
    title: "Padrões de documentos",
    description: "Padrão de exibição de valor em voucher e ordem de serviço.",
  },
  {
    href: "/admin/configuracoes/impostos",
    group: "Empresa e operação",
    title: "Impostos",
    description: "Alíquota padrão de imposto/NF — sem valor de fábrica, só o que você definir aqui.",
  },
  {
    href: "/admin/configuracoes/comissoes",
    group: "Regras e acesso",
    title: "Comissões padrão",
    description: "Percentual de comissão sugerido ao cadastrar uma nova empresa ou motorista, por categoria.",
  },
  {
    href: "/admin/configuracoes/usuarios",
    group: "Regras e acesso",
    title: "Usuários internos",
    description: "Criação e desativação de acessos da equipe (financeiro, operacional, proprietário).",
  },
];

export default async function ConfiguracoesPage() {
  const user = await getCurrentUser();
  const visibleSections = user?.is_owner
    ? sections
    : sections.filter((section) => section.href !== "/admin/configuracoes/usuarios");
  const groups = visibleSections.reduce<
    Array<{ label: string; items: typeof visibleSections }>
  >((result, section) => {
    const group = result.find((item) => item.label === section.group);
    if (group) group.items.push(section);
    else result.push({ label: section.group, items: [section] });
    return result;
  }, []);

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">Controle do sistema</p>
        <h1 className="page-heading mt-1">Configurações</h1>
        <p className="page-description">
          Defina dados globais, regras operacionais, documentos e acessos por
          área.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group.label}>
          <h2 className="mb-3 text-sm font-semibold text-forest">
            {group.label}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="surface-panel focus-ring group flex min-h-32 flex-col p-4 transition hover:border-gold/70 hover:shadow-[0_8px_24px_rgba(23,41,35,0.06)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-forest">
                    {item.title}
                  </h3>
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-forest/32 transition group-hover:translate-x-0.5 group-hover:text-gold"
                  />
                </div>
                <p className="mt-2 text-sm leading-5 text-forest/58">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
