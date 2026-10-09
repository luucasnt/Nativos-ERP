import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

const RESULT_LIMIT = 5;
const SELECT_LIMIT = 20;
const ENTITIES = ["client", "partner", "company", "driver", "vehicle"];

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.account_type !== "internal" || user.status !== "ativo") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  const entity = new URL(request.url).searchParams.get("entity");
  if (entity && !ENTITIES.includes(entity)) {
    return NextResponse.json({ error: "Tipo de cadastro inválido." }, { status: 400 });
  }
  // Selectors load existing registrations on focus, including an empty
  // search. Global search keeps its two-character minimum.
  if (!entity && query.length < 2) return NextResponse.json({ results: [] });
  const limit = entity ? SELECT_LIMIT : RESULT_LIMIT;

  const contains = { contains: query, mode: "insensitive" as const };
  const [reservations, clients, drivers, vehicles, companies] = await Promise.all([
    entity ? Promise.resolve([]) :
    prisma.reservation.findMany({
      where: { OR: [{ code: contains }, { client: { is: { name: contains } } }, { services: { some: { pickup_location: contains } } }, { services: { some: { dropoff_location: contains } } }] },
      orderBy: { created_at: "desc" },
      take: RESULT_LIMIT,
      select: { id: true, code: true, status: true, client: { select: { name: true } } },
    }),
    entity && entity !== "client" ? Promise.resolve([]) : prisma.client.findMany({
      where: { OR: [{ name: contains }, { phone: contains }, { email: contains }, { document: contains }] },
      orderBy: { name: "asc" }, take: limit,
      select: { id: true, name: true, phone: true },
    }),
    entity && entity !== "driver" ? Promise.resolve([]) : prisma.driver.findMany({
      where: { OR: [{ name: contains }, { phone: contains }, { email: contains }, { document: contains }] },
      orderBy: { name: "asc" }, take: limit,
      select: { id: true, name: true, phone: true },
    }),
    entity && entity !== "vehicle" ? Promise.resolve([]) : prisma.vehicle.findMany({
      where: { OR: [{ plate: contains }, { model: contains }] },
      orderBy: { model: "asc" }, take: limit,
      select: { id: true, model: true, plate: true },
    }),
    entity && !["company", "partner"].includes(entity) ? Promise.resolve([]) : prisma.company.findMany({
      where: { ...(entity === "partner" ? { roles: { has: "parceiro" } } : {}), OR: [{ name: contains }, { contact_name: contains }, { contact_phone: contains }, { contact_email: contains }, { document: contains }] },
      orderBy: { name: "asc" }, take: limit,
      select: { id: true, name: true, roles: true },
    }),
  ]);

  return NextResponse.json({
    results: [
      ...reservations.map((item) => ({ id: `reservation-${item.id}`, value: item.id, type: "Reserva", title: item.code, description: `${item.client.name} · ${item.status.replaceAll("_", " ")}`, href: `/admin/reservas/${item.id}` })),
      ...clients.map((item) => ({ id: `client-${item.id}`, value: item.id, type: "Cliente", title: item.name, description: item.phone ?? "Cadastro de cliente", href: `/admin/clientes/${item.id}` })),
      ...drivers.map((item) => ({ id: `driver-${item.id}`, value: item.id, type: "Motorista", title: item.name, description: item.phone ?? "Cadastro de motorista", href: `/admin/motoristas/${item.id}` })),
      ...vehicles.map((item) => ({ id: `vehicle-${item.id}`, value: item.id, type: "Veículo", title: item.model, description: item.plate, href: `/admin/veiculos/${item.id}` })),
      ...companies.map((item) => ({ id: `company-${item.id}`, value: item.id, type: item.roles.includes("fornecedor") ? "Fornecedor" : "Parceiro", title: item.name, description: item.roles.join(" e "), href: `/admin/empresas/${item.id}` })),
    ],
  });
}
