import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateClient } from "../actions";
import { ClientForm } from "../client-form";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [client, partners] = await Promise.all([
    prisma.client.findUnique({ where: { id } }),
    prisma.company.findMany({
      where: { roles: { has: "parceiro" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">
        Editar cliente
      </h1>
      <ClientForm
        action={updateClient.bind(null, id)}
        partners={partners}
        defaultValues={{
          name: client.name,
          document: client.document,
          email: client.email,
          phone: client.phone,
          origin: client.origin,
          origin_partner_id: client.origin_partner_id,
        }}
      />
    </div>
  );
}
