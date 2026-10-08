import { describe, expect, it } from "vitest";
import { csvCell, reportFilters } from "@/lib/reports/management";
describe("relatório e exportação usam os mesmos filtros", () => {
  it("aplica empresa, status e período e inclui todo o último dia", () => { const id = crypto.randomUUID(); const f = reportFilters({ empresa: id, status: "confirmado", de: "2026-10-01", ate: "2026-10-08" }); expect(f.where).toMatchObject({ status: "confirmado", OR: [{ origin_partner_id: id }, { services: { some: { supplier_id: id } } }] }); expect(f.to.toISOString()).toBe("2026-10-08T23:59:59.999Z"); });
  it("não passa enum ou UUID inválidos ao banco", () => { const f = reportFilters({ empresa: "inválido", status: "inexistente", de: "2026-02-30" }, new Date("2026-10-08T12:00:00Z")); expect(f.companyId).toBeUndefined(); expect(f.where.status).toBeUndefined(); expect(f.from.toISOString()).toBe("2026-09-08T00:00:00.000Z"); });
  it.each(["=1+1", "+SUM(A1)", "@SUM(A1)", "-1+2", "  =2", "\tABC"])("neutraliza fórmula CSV %s", (value) => expect(csvCell(value).startsWith('"\'')).toBe(true));
  it("preserva aspas e ponto-e-vírgula como conteúdo", () => expect(csvCell('Ana; "Silva"')).toBe('"Ana; ""Silva"""'));
});
