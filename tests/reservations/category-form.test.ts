// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ServiceForm } from "@/app/admin/reservas/[id]/servicos/service-form";
import { ReservationForm } from "@/app/admin/reservas/reservation-form";
afterEach(cleanup);
const categories = [{ id: "base", label: "Convencional" }, { id: "upgrade", label: "Executiva" }];
it("registra escolha financeira e categoria na reserva", () => {
  const view = render(createElement(ReservationForm, { action: async () => ({ error: null }), clients: [], partners: [], companies: [], drivers: [], categories, cancelHref: "/" }));
  fireEvent.change(screen.getByLabelText("Categoria contratada pelo cliente"), { target: { value: "base" } });
  fireEvent.change(screen.getByLabelText("Informações financeiras no voucher do cliente"), { target: { value: "nao" } });
  const data = new FormData(view.container.querySelector("form")!);
  expect(data.get("contracted_category_id")).toBe("base"); expect(data.get("voucher_show_price")).toBe("nao");
});
it("upgrade é opcional, exige outra categoria e limpa seleção ao mudar contratação", () => {
  const view = render(createElement(ServiceForm, { action: async () => ({ error: null }), suppliers: [], drivers: [], vehicles: [], disposicaoPackages: [], categories, reservationCategoryId: "base", cancelHref: "/" }));
  fireEvent.click(screen.getByLabelText("Oferecer upgrade de categoria como cortesia"));
  const select = screen.getByLabelText("Categoria superior oferecida ao cliente") as HTMLSelectElement;
  expect([...select.options].map(option => option.value)).not.toContain("base");
  fireEvent.change(select, { target: { value: "upgrade" } });
  expect(new FormData(view.container.querySelector("form")!).get("upgrade_category_id")).toBe("upgrade");
  fireEvent.change(screen.getByLabelText("Categoria contratada"), { target: { value: "upgrade" } });
  expect(screen.queryByLabelText("Categoria superior oferecida ao cliente")).toBeNull();
  expect(new FormData(view.container.querySelector("form")!).get("category_upgrade_enabled")).toBeNull();
});
