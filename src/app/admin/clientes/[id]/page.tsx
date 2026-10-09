import { getClientActivity, EMPTY_CLIENT_ACTIVITY } from "@/lib/clients/activity";
import { ClientActivitySummary } from "@/components/admin/client-activity-summary";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteClient, updateClient } from "../actions";
import { DeleteRecordButton } from "@/components/admin/delete-record-button";
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

  const activity = (await getClientActivity([id])).get(id) ?? EMPTY_CLIENT_ACTIVITY;

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">
        {client.name} {client.is_vip && <Badge tone="gold">VIP</Badge>}
      </h1>
      <ClientActivitySummary activity={activity} />
      <ClientForm
        action={updateClient.bind(null, id)}
        partners={partners}
        defaultValues={{
          is_vip: client.is_vip,
          name: client.name,
          document: client.document,
          email: client.email,
          phone: client.phone,
          origin: client.origin,
          origin_partner_id: client.origin_partner_id,
        }}
      />
      <DeleteRecordButton id={client.id} label={`o cliente ${client.name}`} action={deleteClient} successHref="/admin/clientes" />
    </div>
  );
}
