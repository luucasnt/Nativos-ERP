export type ExecutionType = "propria" | "fornecedor";
export type ResourceOwnership = { owner_type: "proprio" | "terceirizado"; supplier_id: string | null };

export function serviceResourceScope(executionType: ExecutionType, supplierId: string | null): ResourceOwnership | null {
  if (executionType === "propria") return { owner_type: "proprio", supplier_id: null };
  return supplierId ? { owner_type: "terceirizado", supplier_id: supplierId } : null;
}

export function resourceMatchesScope(resource: ResourceOwnership, executionType: ExecutionType, supplierId: string | null) {
  const scope = serviceResourceScope(executionType, supplierId);
  return scope !== null && resource.owner_type === scope.owner_type && resource.supplier_id === scope.supplier_id;
}
