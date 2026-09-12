export function formatCurrency(value: { toString(): string } | number): string {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatDateTime(value: Date): string {
  return value.toLocaleString("pt-BR");
}
