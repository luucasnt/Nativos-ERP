// @vitest-environment jsdom
import { createElement, type ComponentProps } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ServiceForm } from "@/app/admin/reservas/[id]/servicos/service-form";
const a = crypto.randomUUID(), b = crypto.randomUUID();
const drivers = [{ id: "own-driver", name: "Motorista próprio", owner_type: "proprio" as const, supplier_id: null }, { id: "a-driver", name: "Motorista A", owner_type: "terceirizado" as const, supplier_id: a }, { id: "b-driver", name: "Motorista B", owner_type: "terceirizado" as const, supplier_id: b }];
const vehicles = [{ id: "own-vehicle", name: "Veículo próprio", owner_type: "proprio" as const, supplier_id: null }, { id: "a-vehicle", name: "Veículo A", owner_type: "terceirizado" as const, supplier_id: a }, { id: "b-vehicle", name: "Veículo B", owner_type: "terceirizado" as const, supplier_id: b }];
const suppliers = [{ id: a, name: "Fornecedor A" }, { id: b, name: "Fornecedor B" }];
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function fixture(defaultValues?: ComponentProps<typeof ServiceForm>["defaultValues"]) {
  const fetchMock = vi.fn(async (url: string) => {
    const p = new URL(url, "https://erp.test").searchParams;
    const entity = p.get("entity"), own = p.get("execution_type") === "propria", supplier = p.get("supplier_id");
    const records = entity === "supplier" ? suppliers : (entity === "driver" ? drivers : vehicles).filter((r) => own ? r.owner_type === "proprio" : r.supplier_id === supplier);
    return { ok: true, json: async () => ({ results: records.map((r) => ({ value: r.id, title: r.name })) }) };
  });
  vi.stubGlobal("fetch", fetchMock);
  const view = render(createElement(ServiceForm, { action: async () => ({ error: null }), suppliers, drivers, vehicles, disposicaoPackages: [], cancelHref: "/admin/reservas", defaultValues }));
  const form = view.container.querySelector("form")!;
  const selected = (name: string) => new FormData(form).get(name);
  return { fetchMock, selected };
}
async function choose(label: string, name: string) {
  fireEvent.focus(screen.getByRole("combobox", { name: label }));
  fireEvent.click(await screen.findByRole("option", { name }));
}
describe("formulário de serviço respeita fornecedor", () => {
  it("trocar execução e fornecedor limpa os dois recursos e envia filtros na busca", async () => {
    const { selected, fetchMock } = fixture();
    await choose("Motorista", "Motorista próprio"); await choose("Veículo", "Veículo próprio");
    expect(selected("driver_id")).toBe("own-driver");
    fireEvent.change(screen.getByLabelText("Execução *"), { target: { value: "fornecedor" } });
    expect(selected("driver_id")).toBe(""); expect(selected("vehicle_id")).toBe("");
    expect((screen.getByRole("combobox", { name: "Motorista" }) as HTMLInputElement).disabled).toBe(true);
    await choose("Fornecedor *", "Fornecedor A");
    await choose("Motorista", "Motorista A"); await choose("Veículo", "Veículo A");
    expect(selected("driver_id")).toBe("a-driver"); expect(selected("vehicle_id")).toBe("a-vehicle");
    expect(fetchMock.mock.calls.some(([url]) => url.includes(`entity=driver&q=&execution_type=fornecedor&supplier_id=${a}`))).toBe(true);
    const supplier = screen.getByRole("combobox", { name: "Fornecedor *" });
    fireEvent.change(supplier, { target: { value: "" } });
    expect(selected("driver_id")).toBe(""); expect(selected("vehicle_id")).toBe("");
    await choose("Fornecedor *", "Fornecedor B");
    await choose("Motorista", "Motorista B"); await choose("Veículo", "Veículo B");
    expect(selected("driver_id")).toBe("b-driver"); expect(selected("vehicle_id")).toBe("b-vehicle");
  });
  it("edição mantém o vínculo atual e não restaura recursos antigos após trocar fornecedor", async () => {
    const defaults: NonNullable<ComponentProps<typeof ServiceForm>["defaultValues"]> = {
      type: "transfer_chegada", execution_type: "fornecedor", supplier_id: a, driver_id: "a-driver", vehicle_id: "a-vehicle",
      scheduled_date: null, scheduled_time: null, pickup_location: null, dropoff_location: null, passenger_count: null, flight_number: null, notes: null, pacote_disposicao_id: null,
      km_incluido: null, valor_hora_extra: null, valor_km_extra: null, original_price: "100", supplier_cost: "50", discount_type: "nenhum", discount_value: null, discount_reason: null,
      luggage_10kg: 0, luggage_23kg: 0, luggage_32kg: 0, bebe_conforto: 0, cadeirinha: 0, booster: 0, driver_can_receive_payment: false, reception_sign_enabled: false, reception_passenger_name: null, os_show_price: null,
    };
    const { selected } = fixture(defaults);
    expect(selected("driver_id")).toBe("a-driver"); expect(selected("vehicle_id")).toBe("a-vehicle");
    fireEvent.change(screen.getByRole("combobox", { name: "Fornecedor *" }), { target: { value: "" } });
    await choose("Fornecedor *", "Fornecedor B");
    fireEvent.change(screen.getByRole("combobox", { name: "Fornecedor *" }), { target: { value: "" } });
    await choose("Fornecedor *", "Fornecedor A");
    expect(selected("driver_id")).toBe(""); expect(selected("vehicle_id")).toBe("");
  });
});
