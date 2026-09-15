import { CarFront, Info } from "lucide-react";
import { requireCompanyPortalUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export default async function PartnerGuidePage() {
  const user = await requireCompanyPortalUser();
  if (!user.linked_company.roles.includes("parceiro")) return null;
  const [categories, vehicles] = await Promise.all([
    prisma.catalogItem.findMany({ where: { type: "tipo_veiculo", active: true }, orderBy: [{ order: "asc" }, { label: "asc" }] }),
    prisma.vehicle.findMany({ where: { status: "ativo", approval_status: "aprovado" }, include: { category: true }, orderBy: { model: "asc" } }),
  ]);
  const grouped = categories.map((category) => ({ category, models: [...new Set(vehicles.filter((vehicle) => vehicle.category_id === category.id).map((vehicle) => vehicle.model))] }));
  return <div className="mx-auto max-w-[1180px] space-y-6"><header><p className="eyebrow">Material de apoio</p><h1 className="page-heading mt-1">Categorias e veículos</h1><p className="page-description">Use este guia para orientar seu cliente sobre capacidade, conforto e modelos de referência disponíveis.</p></header><section className="surface-panel border-l-4 border-l-gold p-5"><div className="flex gap-3"><Info size={18} className="mt-0.5 shrink-0 text-gold" /><p className="text-sm leading-6 text-forest/70">O modelo exato pode variar conforme disponibilidade. A reserva garante a categoria escolhida, não necessariamente uma unidade específica.</p></div></section><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{grouped.map(({ category, models }) => <article key={category.id} className="surface-panel p-5"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Categoria</p><h2 className="mt-1 text-lg font-semibold text-forest">{category.label}</h2></div><CarFront size={20} className="text-gold" /></div><p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-forest/55">Modelos de referência</p>{models.length ? <ul className="mt-2 space-y-1.5 text-sm text-ink/75">{models.map((model) => <li key={model}>• {model}</li>)}</ul> : <p className="mt-2 text-sm text-forest/62">Disponibilidade sob consulta.</p>}</article>)}</section></div>;
}
