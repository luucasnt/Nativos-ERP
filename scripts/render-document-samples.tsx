import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { ContractDocument } from "@/lib/documents/contract";
import { InvoiceDocument } from "@/lib/documents/invoice";
import { QuoteDocument } from "@/lib/documents/quote";
import { ReceiptDocument } from "@/lib/documents/receipt";
import { ReceptionSignDocument } from "@/lib/documents/reception-sign";
import { VoucherDocument } from "@/lib/documents/voucher";
import { WorkOrderDocument } from "@/lib/documents/work-order";

const outputDir = path.join(process.cwd(), "output/pdf");

const client = {
  id: "client-1",
  name: "Mariana Albuquerque",
  document: "123.456.789-00",
  email: "mariana@example.com",
  phone: "+55 11 99999-0000",
};

const services = [
  {
    id: "service-1",
    type: "transfer_chegada",
    scheduled_date: new Date("2026-10-18T00:00:00.000Z"),
    scheduled_time: "14:30",
    pickup_location: "Aeroporto de Porto Seguro",
    dropoff_location: "Hotel Fasano Trancoso",
    passenger_count: 3,
    flight_number: "LA 3314",
    notes: "Recepcionar no desembarque com plaquinha. Cliente viaja com uma criança.",
    luggage_10kg: 2,
    luggage_23kg: 2,
    luggage_32kg: 0,
    bebe_conforto: 0,
    cadeirinha: 1,
    booster: 0,
    price: 680,
    started_at: null,
    completed_at: null,
    reception_passenger_name: "Mariana Albuquerque",
    reservation: {
      id: "reservation-1",
      code: "RES-2026-0148",
      client,
    },
    driver: { id: "driver-1", name: "João Pereira" },
    vehicle: { id: "vehicle-1", model: "Jeep Commander", plate: "RST-2A34" },
  },
  {
    id: "service-2",
    type: "passeio",
    scheduled_date: new Date("2026-10-20T00:00:00.000Z"),
    scheduled_time: "09:00",
    pickup_location: "Hotel Fasano Trancoso",
    dropoff_location: "Praia do Espelho",
    passenger_count: 3,
    flight_number: null,
    notes: null,
    luggage_10kg: 0,
    luggage_23kg: 0,
    luggage_32kg: 0,
    bebe_conforto: 0,
    cadeirinha: 1,
    booster: 0,
    price: 920,
  },
];

const reservation = {
  id: "reservation-1",
  code: "RES-2026-0148",
  client,
  services,
};

const clauses = [
  {
    id: "clause-1",
    category: "geral",
    order: 1,
    title: "Objeto e execução dos serviços",
    content:
      "A Nativos Experiences prestará os serviços descritos na reserva vinculada, observando datas, horários, rotas, quantidade de passageiros e recursos confirmados. Mudanças solicitadas após a confirmação dependem de disponibilidade operacional.",
  },
  {
    id: "clause-2",
    category: "financeiro",
    order: 2,
    title: "Pagamento",
    content:
      "Os valores, prazos e formas de pagamento seguem a proposta aprovada. Custos adicionais decorrentes de alterações de rota, espera extraordinária ou serviços extras serão previamente informados sempre que possível.",
  },
  {
    id: "clause-3",
    category: "cancelamento",
    order: 3,
    title: "Cancelamento e ausência",
    content:
      "Pedidos de cancelamento devem ser encaminhados pelos canais oficiais. Eventuais retenções ou cobranças seguirão as condições comerciais aceitas para a reserva e a antecedência do pedido.",
  },
];

async function save(name: string, document: ReturnType<typeof VoucherDocument>) {
  const buffer = await renderToBuffer(document);
  await writeFile(path.join(outputDir, name), buffer);
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  await save(
    "voucher-nativos.pdf",
    VoucherDocument({ data: { reservation, showPrice: true } as never }),
  );
  await save(
    "ordem-de-servico-nativos.pdf",
    WorkOrderDocument({ data: { service: services[0], showPrice: false } as never }),
  );
  await save(
    "orcamento-nativos.pdf",
    QuoteDocument({ data: { reservation } as never }),
  );
  await save(
    "contrato-nativos.pdf",
    ContractDocument({
      data: {
        reservation: {
          id: reservation.id,
          code: reservation.code,
          client,
          services: services.map((service) => ({ id: service.id })),
        },
        clauses,
      } as never,
    }),
  );
  await save(
    "recibo-nativos.pdf",
    ReceiptDocument({
      data: {
        partyName: client.name,
        payment: {
          id: "a48d4b12-3c88-4e92-8732-121fbf59ca45",
          amount: 680,
          type: "recebimento",
          payment_method: "pix",
          created_at: new Date("2026-09-13T14:32:00.000Z"),
          bank_account: { name: "Conta operacional Nativos" },
          finance_entry: {
            category: "recebimento_cliente",
            party_type: "cliente",
            party_id: client.id,
            reservation: { id: reservation.id, code: reservation.code },
          },
        },
      } as never,
    }),
  );
  await save(
    "plaquinha-nativos.pdf",
    ReceptionSignDocument({ data: { passengerName: client.name } }),
  );
  await save(
    "fatura-nativos.pdf",
    InvoiceDocument({
      data: {
        bankAccount: {
          id: "bank-1",
          name: "Conta operacional Nativos",
          pix_key: "financeiro@nativosexperiences.com.br",
        },
        billingCycle: {
          id: "7b46d5a2-3ff8-47cb-b939-cd4b41d93a80",
          period: "2026-09",
          closing_day: 25,
          due_day: 10,
          total_amount: 1600,
          paid_amount: 0,
          status: "faturado",
          updated_at: new Date("2026-09-26T12:00:00.000Z"),
          company: {
            name: "Hotel Reserva Jacumã",
            document: "12.345.678/0001-90",
          },
          reservations: [
            {
              created_at: new Date(),
              reservation: {
                ...reservation,
                created_at: new Date("2026-09-05T12:00:00.000Z"),
              },
            },
          ],
        },
      } as never,
    }),
  );

  console.log("7 PDFs gerados em " + outputDir);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

