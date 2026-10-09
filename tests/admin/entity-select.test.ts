// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SearchableEntitySelect } from "@/components/ui/searchable-entity-select";

const result = (id: string, title: string) => ({ ok: true, json: async () => ({ results: [{ value: id, title }] }) });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function fixture() {
  const view = render(createElement("form", {}, createElement(SearchableEntitySelect, { name: "client_id", label: "Cliente", entity: "client", required: true })));
  return { ...view, input: screen.getByRole("combobox") as HTMLInputElement, form: view.container.querySelector("form")! };
}

describe("seleção pesquisável de cliente", () => {
  it("carrega ao clicar e envia o id do cliente selecionado", async () => {
    const fetchMock = vi.fn(async (_url: string) => result("client-1", "Cliente cadastrado")); vi.stubGlobal("fetch", fetchMock);
    const { input, form, container } = fixture();
    expect(container.querySelectorAll("label")).toHaveLength(1);
    fireEvent.focus(input);
    fireEvent.click(await screen.findByRole("option", { name: "Cliente cadastrado" }));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/admin/search?entity=client&q=");
    expect(new FormData(form).get("client_id")).toBe("client-1");
    expect(input.value).toBe("Cliente cadastrado");
    expect(form.checkValidity()).toBe(true);
  });
  it("pesquisa uma letra e impede salvar texto que não corresponde a uma seleção", async () => {
    const fetchMock = vi.fn(async (_url: string) => result("client-2", "Zelia")); vi.stubGlobal("fetch", fetchMock);
    const { input, form } = fixture();
    fireEvent.change(input, { target: { value: "Z" } });
    await screen.findByRole("option", { name: "Zelia" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/admin/search?entity=client&q=Z");
    expect(form.checkValidity()).toBe(false);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(new FormData(form).get("client_id")).toBe("client-2");
    fireEvent.change(input, { target: { value: "Outro" } });
    expect(new FormData(form).get("client_id")).toBe("");
    expect(form.checkValidity()).toBe(false);
  });
  it("lista novamente quando o termo é apagado", async () => {
    const fetchMock = vi.fn(async (url: string) => result("client-3", url.endsWith("q=") ? "Todos" : "Busca")); vi.stubGlobal("fetch", fetchMock);
    const { input } = fixture();
    fireEvent.change(input, { target: { value: "Busca" } });
    await screen.findByRole("option", { name: "Busca" });
    fireEvent.change(input, { target: { value: "" } });
    await screen.findByRole("option", { name: "Todos" });
  });
  it("mostra falha de rede e permite tentar novamente", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("Falha de rede")).mockResolvedValue(result("client-4", "Recuperado")); vi.stubGlobal("fetch", fetchMock);
    const { input } = fixture(); fireEvent.focus(input);
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível pesquisar");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await screen.findByRole("option", { name: "Recuperado" });
  });
  it("informa sessão expirada em vez de esconder o erro", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401 })));
    const { input } = fixture(); fireEvent.focus(input);
    expect((await screen.findByRole("alert")).textContent).toContain("Sua sessão expirou");
  });
  it("descarta resposta antiga mesmo quando o servidor ignora o cancelamento", async () => {
    let resolveOld!: (value: ReturnType<typeof result>) => void;
    const fetchMock = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValue(result("new", "Resultado novo"));
    vi.stubGlobal("fetch", fetchMock);
    const { input } = fixture(); fireEvent.change(input, { target: { value: "antigo" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.change(input, { target: { value: "novo" } });
    await screen.findByRole("option", { name: "Resultado novo" });
    resolveOld(result("old", "Resultado antigo"));
    await waitFor(() => expect(screen.queryByRole("option", { name: "Resultado antigo" })).toBeNull());
    expect(screen.getByRole("option", { name: "Resultado novo" })).toBeTruthy();
  });
});
