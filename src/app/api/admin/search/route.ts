import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

const RESULT_LIMIT = 5;

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.account_type !== "internal" || user.status !== "ativo") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  if (query.length < 2) return NextResponse.json({ results: [] });

  const contains = { contains: query, mode: "insensitive" as const };
  const [reservations, clients, drivers, vehicles, companies] = await Promise.all([
    prisma.reservation.findMany({
      where: { OR: [{ code: contains }, { client: { is: { name: contains } } }, { services: { some: { pickup_location: contains } } }, { services: { some: { dropoff_location: contains } } }] },
      orderBy: { created_at: "desc" },
      take: RESULT_LIMIT,
      select: { id: true, code: true, status: true, client: { select: { name: true } } },
    }),
    prisma.client.findMany({
      where: { OR: [{ name: contains }, { phone: contains }, { email: contains }, { document: contains }] },
      orderBy: { name: "asc" }, take: RESULT_LIMIT,
      select: { id: true, name: true, phone: true },
    }),
    prisma.driver.findMany({
      where: { OR: [{ name: contains }, { phone: contains }, { email: contains }, { document: contains }] },
      orderBy: { name: "asc" }, take: RESULT_LIMIT,
      select: { id: true, name: true, phone: true },
    }),
    prisma.vehicle.findMany({
      where: { OR: [{ plate: contains }, { model: contains }] },
      orderBy: { model: "asc" }, take: RESULT_LIMIT,
      select: { id: true, model: true, plate: true },
    }),
    prisma.company.findMany({
      where: { OR: [{ name: contains }, { contact_name: contains }, { contact_phone: contains }, { contact_email: contains }, { document: contains }] },
      orderBy: { name: "asc" }, take: RESULT_LIMIT,
      select: { id: true, name: true, roles: true },
    }),
  ]);

  return NextResponse.json({
    results: [
      ...reservations.map((item) => ({ id: `reservation-${item.id}`, type: "Reserva", title: item.code, description: `${item.client.name} · ${item.status.replaceAll("_", " ")}`, href: `/admin/reservas/${item.id}` })),
      ...clients.map((item) => ({ id: `client-${item.id}`, type: "Cliente", title: item.name, description: item.phone ?? "Cadastro de cliente", href: `/admin/clientes/${item.id}` })),
      ...drivers.map((item) => ({ id: `driver-${item.id}`, type: "Motorista", title: item.name, description: item.phone ?? "Cadastro de motorista", href: `/admin/motoristas/${item.id}` })),
      ...vehicles.map((item) => ({ id: `vehicle-${item.id}`, type: "Veículo", title: item.model, description: item.plate, href: `/admin/veiculos/${item.id}` })),
      ...companies.map((item) => ({ id: `company-${item.id}`, type: item.roles.includes("fornecedor") ? "Fornecedor" : "Parceiro", title: item.name, description: item.roles.join(" e "), href: `/admin/empresas/${item.id}` })),
    ],
  });
}
