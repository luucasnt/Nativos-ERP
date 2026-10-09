import { loadDocumentCompany } from "@/lib/documents/company";
import { PrismaClient } from "@prisma/client";
import { loadInvoiceData, InvoiceDocument } from "@/lib/documents/invoice";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { loadVoucherData, VoucherDocument } from "@/lib/documents/voucher";
import { loadWorkOrderData, WorkOrderDocument } from "@/lib/documents/work-order";
import { ReceptionSignDocument } from "@/lib/documents/reception-sign";

const reservationId = "50000000-0000-0000-0000-000000000001";
const serviceId = "60000000-0000-0000-0000-000000000001";
// Artefatos de revisão são opcionais e nunca usam o banco de produção.
async function review(name: string, document: Parameters<typeof renderToBuffer>[0]) {
  const buffer = await renderToBuffer(document);
  expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  if (process.env.PDF_REVIEW_DIR) {
    mkdirSync(process.env.PDF_REVIEW_DIR, { recursive: true });
    const file = `${process.env.PDF_REVIEW_DIR}/${name}.pdf`;
    writeFileSync(file, buffer);
    return {
      text: execFileSync("pdftotext", [file, "-"], { encoding: "utf8" }),
      pages: Number(execFileSync("pdfinfo", [file], { encoding: "utf8" }).match(/Pages:\s+(\d+)/)?.[1]),
    };
  }
  return { text: "", pages: (buffer.toString("latin1").match(/\/Type \/Page\b/g) || []).length };
}

describe("documentos operacionais completos", () => {
  it("usa dados salvos da empresa e mantém o agradecimento com rodapé personalizado", async () => {
    const prisma = new PrismaClient();
    const previous = await prisma.setting.findUnique({ where: { key: "empresa_dados" } });
    const value = { name: "Nativos Experiences", document: "22.891.018/0001-63", address: "Rua Carlos Alberto Parracho, 436", city: "Trancoso", state: "BA", email: "contato@nativosexperiences.com", phone: "73 99168-1630 / 73 99967-9508", website: "https://www.nativosexperiences.com/", footer: "Atendimento personalizado em Trancoso." };
    await prisma.setting.upsert({ where: { key: "empresa_dados" }, create: { key: "empresa_dados", value, category: "empresa" }, update: { value } });
    try {
      expect(await loadDocumentCompany()).toEqual(value);
      const data = await loadVoucherData(reservationId);
      expect(data.company.document).toBe(value.document);
      const result = await review("voucher-empresa", VoucherDocument({ data }));
      if (result.text) {
        expect(result.text).toContain(value.document);
        expect(result.text).toContain(value.footer);
        expect(result.text).toContain("Obrigado por escolher");
      }
    } finally {
      if (previous) await prisma.setting.update({ where: { key: "empresa_dados" }, data: { value: previous.value! } });
      else await prisma.setting.delete({ where: { key: "empresa_dados" } });
      await prisma.$disconnect();
    }
  });
  it("voucher inclui recursos, diferencia chegada/saída e pagina muitos serviços", async () => {
    const data = await loadVoucherData(reservationId);
    data.company = { name: "Nativos Experiences", document: "22.891.018/0001-63", address: "Rua Carlos Alberto Parracho, 436", city: "Trancoso", state: "BA", phone: "73 99168-1630", email: "contato@nativosexperiences.com" };
    const service = data.reservation.services[0];
    expect(service).toBeDefined();
    data.showPrice = true;
    const assigned = { ...service, contracted_category_label: "Convencional", upgrade_category_label: "Executiva", scheduled_date: new Date("2026-10-15T00:00:00Z"), scheduled_time: "14:00", pickup_location: "Aeroporto de Porto Seguro", dropoff_location: "Hotel em Trancoso", passenger_count: 4, luggage_23kg: 2, cadeirinha: 1, type: "transfer_chegada" as const, driver: { ...service.driver!, name: "Motorista de teste" }, vehicle: { ...service.vehicle!, model: "Toyota Corolla", plate: "ABC1D23" }, flight_number: "AD 1234" };
    data.reservation.services = [assigned, { ...assigned, id: "saida", type: "transfer_saida", scheduled_time: "09:00", pickup_location: "Hotel em Trancoso", dropoff_location: "Aeroporto de Porto Seguro" }];
    const compact = await review("voucher", VoucherDocument({ data }));
    if (compact) {
      expect(compact.pages).toBe(1);
      if (compact.text) expect(compact.text).toContain("Página 1 de 1");
      if (compact.text) {
        const text = compact.text.replace(/\s+/g, " ");
        expect(text).toContain("Este é seu voucher de confirmação");
        expect(text).toContain("acompanha o voo de chegada em tempo real");
        expect(text).toContain("Upgrade de cortesia: Executiva");
        expect(text).toContain("sem custo adicional");
      }
      if (compact.text) expect(compact.text).toContain("ABC1D23");
      if (compact.text) expect(compact.text).toContain("Motorista de teste");
      if (compact.text) expect(compact.text).toContain("22.891.018/0001-63");
      if (compact.text) expect(compact.text.replace(/\s/g, "").toUpperCase()).toContain("VOODESAÍDA");
    }
    data.showPrice = false;
    const hidden = await review("voucher-sem-financeiro", VoucherDocument({ data }));
    expect(hidden.pages).toBe(1);
    if (hidden.text) { expect(hidden.text).not.toContain("R$"); expect(hidden.text).toContain("Upgrade de cortesia"); }
    data.showPrice = true;
    data.reservation.services = Array.from({ length: 12 }, (_, i) => ({ ...assigned, id: String(i) }));
    const many = await review("voucher-many", VoucherDocument({ data }));
    if (many) {
      expect(many.pages).toBeGreaterThan(1);
      if (many.text) {
        for (const page of many.text.split("\f").filter(page => page.trim())) {
          expect(page).toContain("22.891.018/0001-63");
          expect(page).toContain("Página");
        }
      }
    }
  });
  it("ordem de serviço não força segunda página", async () => {
    const data = await loadWorkOrderData(serviceId);
    const result = await review("os", WorkOrderDocument({ data }));
    if (result) expect(result.pages).toBe(1);
    data.service.reservation.collection_mode = "direto";
    data.service.collection_actor = "motorista_proprio";
    data.service.finance_entries = [];
    data.service.direct_collections = [];
    data.service.driver_can_receive_payment = false;
    data.showPrice = false;
    const direct = await review("os-cobranca-direta", WorkOrderDocument({ data }));
    expect(direct.pages).toBe(1);
    if (direct.text) expect(direct.text.replace(/\s+/g, " ")).toContain("deve receber diretamente do cliente: R$");
  });
  it("fatura usa o mesmo padrão profissional", async () => {
    const prisma = new PrismaClient();
    const company = await prisma.company.create({ data: { name: "Empresa de revisão", roles: ["parceiro"] } });
    const cycle = await prisma.billingCycle.create({ data: { company_id: company.id, period: "2026-10", closing_day: 20, due_day: 25, total_amount: 450, reservations: { create: { reservation_id: reservationId } } } });
    try {
      const data = await loadInvoiceData(cycle.id);
      const result = await review("fatura", InvoiceDocument({ data }));
      expect(result.pages).toBe(1);
    } finally {
      await prisma.billingCycleReservation.deleteMany({ where: { billing_cycle_id: cycle.id } });
      await prisma.billingCycle.delete({ where: { id: cycle.id } });
      await prisma.company.delete({ where: { id: company.id } });
      await prisma.$disconnect();
    }
  });
  it("plaquinha segue a referência e acomoda nomes longos", async () => {
    const result = await review("plaquinha", ReceptionSignDocument({ data: { passengerName: "Marilberto Nogueira de França" } }));
    if (result) expect(result.pages).toBe(1);
    const long = await review("plaquinha-long", ReceptionSignDocument({ data: { passengerName: "Maria Aparecida de Albuquerque e Família Nogueira de França" } }));
    if (long) expect(long.pages).toBe(1);
  });
});
