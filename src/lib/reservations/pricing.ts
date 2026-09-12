import { Prisma } from "@prisma/client";
import type { CollectionActor, CollectionMode, DiscountType, ExecutionType } from "@prisma/client";

// Regra não-negociável (spec seção 6, item 4): desconto em um serviço
// NUNCA altera o custo pago ao fornecedor — a margem da Nativos absorve o
// desconto integralmente. Esta função só calcula `price` a partir de
// `original_price`; quem a chama nunca deve tocar `supplier_cost` aqui.
export function computeServicePrice(
  originalPrice: Prisma.Decimal.Value,
  discountType: DiscountType,
  discountValue: Prisma.Decimal.Value | null,
): Prisma.Decimal {
  const original = new Prisma.Decimal(originalPrice);

  if (discountType === "nenhum" || !discountValue) {
    return original;
  }

  const discount = new Prisma.Decimal(discountValue);

  const price =
    discountType === "percentual"
      ? original.minus(original.mul(discount).div(100))
      : original.minus(discount);

  // Um desconto nunca deveria resultar em preço negativo — trava em zero
  // em vez de deixar um valor sem sentido no razão.
  return price.isNegative() ? new Prisma.Decimal(0) : price;
}

// Derivado de collection_mode (Reservation) + execution_type (Service) —
// nunca definido manualmente (spec seção 5: "collection_actor (derivado de
// collection_mode + execution_type — quem cobra o passageiro de fato)").
export function computeCollectionActor(
  collectionMode: CollectionMode,
  executionType: ExecutionType,
): CollectionActor {
  if (collectionMode !== "direto") {
    return "nativos";
  }
  return executionType === "propria" ? "motorista_proprio" : "fornecedor";
}
