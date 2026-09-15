import { SectionNavigation } from "@/components/ui/section-navigation";
import { prisma } from "@/lib/prisma";
import { tableClass, thClass } from "@/lib/ui";
import { NewCatalogItemForm } from "./new-item-form";
import { ItemRow } from "./item-row";

const TYPES: { value: string; label: string }[] = [
  { value: "tipo_veiculo", label: "Tipo de veículo" },
  { value: "tipo_bagagem", label: "Tipo de bagagem" },
  { value: "tipo_cadeirinha", label: "Tipo de cadeirinha" },
  { value: "categoria_despesa", label: "Categoria de despesa" },
  { value: "categoria_fornecedor_parceiro", label: "Categoria de fornecedor/parceiro" },
  { value: "forma_pagamento", label: "Forma de pagamento" },
  { value: "motivo_perda", label: "Motivo de perda" },
  { value: "pacote_disposicao", label: "Pacote de disposição" },
  { value: "tipo_concierge", label: "Tipo de concierge" },
];

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const activeType = TYPES.some((t) => t.value === type) ? type! : TYPES[0].value;

  const items = await prisma.catalogItem.findMany({
    where: { type: activeType as never },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">Catálogo</h1>

      <div className="mb-6">
        <SectionNavigation
          activeKey={activeType}
          ariaLabel="Categorias do catálogo"
          mobileLabel="Categoria do catálogo"
          items={TYPES.map((type) => ({
            key: type.value,
            label: type.label,
            href: `/admin/configuracoes/catalogo?type=${type.value}`,
          }))}
        />
      </div>

      <NewCatalogItemForm type={activeType} />

      {items.length === 0 ? (
        <p className="text-forest/60">Nenhum item cadastrado nesta categoria.</p>
      ) : (
        <div className="max-w-full overflow-x-auto rounded-xl border border-forest/10">
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Chave</th>
              <th className={thClass}>Rótulo</th>
              <th className={thClass}>Ordem</th>
              <th className={thClass}>Status</th>
              <th className={thClass}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ItemRow
                key={item.id}
                id={item.id}
                keyName={item.key}
                label={item.label}
                order={item.order}
                active={item.active}
              />
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
