import { beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ id: "" }));
vi.mock("@/lib/auth/get-current-user", () => ({ requireInternalUser: async () => ({ id: auth.id }) }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("REDIRECT"); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { prisma } from "@/lib/prisma";
import { createReservation, updateReservation } from "@/app/admin/reservas/actions";
import { createService, updateService } from "@/app/admin/reservas/[id]/servicos/actions";
let client: string, base: string, upgrade: string, reservationId: string, serviceId: string;
beforeAll(async () => {
  auth.id = (await prisma.user.create({ data: { auth_user_id: crypto.randomUUID(), email: `${crypto.randomUUID()}@category.test`, account_type: "internal", role: "admin" } })).id;
  client = (await prisma.client.create({ data: { name: "Cliente categoria" } })).id;
  base = (await prisma.catalogItem.create({ data: { type: "tipo_veiculo", key: crypto.randomUUID(), label: "Convencional" } })).id;
  upgrade = (await prisma.catalogItem.create({ data: { type: "tipo_veiculo", key: crypto.randomUUID(), label: "Executiva" } })).id;
});
const form = (data: Record<string, string>) => { const f = new FormData(); for (const [key, value] of Object.entries(data)) f.set(key, value); return f; };
const reservationForm = (visibility: string) => form({ client_id: client, relationship_mode: "direto", collection_mode: "nativos", contracted_category_id: base, voucher_show_price: visibility });
const serviceForm = (upgraded: boolean) => form({ type: "transfer_chegada", execution_type: "propria", original_price: "380", discount_type: "nenhum", os_show_price: "herda", contracted_category_id: base, ...(upgraded ? { category_upgrade_enabled: "on", upgrade_category_id: upgrade } : {}) });
describe("contratação e upgrade nas ações reais", () => {
  it("registra categoria e opção de financeiro na criação da reserva", async () => {
    await expect(createReservation({ error: null }, reservationForm("sim"))).rejects.toThrow("REDIRECT");
    const reservation = await prisma.reservation.findFirstOrThrow({ where: { client_id: client } });
    reservationId = reservation.id;
    expect(reservation).toMatchObject({ contracted_category_id: base, contracted_category_label: "Convencional", voucher_show_price: true });
  });
  it("copia a categoria para o serviço e mantém preço ao conceder/remover cortesia", async () => {
    await expect(createService(reservationId, { error: null }, serviceForm(false))).rejects.toThrow("REDIRECT");
    serviceId = (await prisma.service.findFirstOrThrow({ where: { reservation_id: reservationId } })).id;
    await expect(updateService(reservationId, serviceId, { error: null }, serviceForm(true))).rejects.toThrow("REDIRECT");
    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
    expect(service).toMatchObject({ contracted_category_label: "Convencional", upgrade_category_label: "Executiva" });
    expect(service.price.toFixed(2)).toBe("380.00"); expect(service.original_price.toFixed(2)).toBe("380.00");
    await expect(updateService(reservationId, serviceId, { error: null }, serviceForm(false))).rejects.toThrow("REDIRECT");
    expect((await prisma.service.findUniqueOrThrow({ where: { id: serviceId } })).upgrade_category_id).toBeNull();
  });
  it("bloqueia upgrade da mesma categoria e permite ocultar financeiro na edição", async () => {
    const invalid = serviceForm(true); invalid.set("upgrade_category_id", base);
    expect((await updateService(reservationId, serviceId, { error: null }, invalid)).error).toContain("diferente");
    await expect(updateReservation(reservationId, { error: null }, reservationForm("nao"))).rejects.toThrow("REDIRECT");
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } })).voucher_show_price).toBe(false);
    expect((await prisma.service.findUniqueOrThrow({ where: { id: serviceId } })).price.toFixed(2)).toBe("380.00");
  });
});
