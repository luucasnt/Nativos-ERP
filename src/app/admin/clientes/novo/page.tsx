import { prisma } from "@/lib/prisma";
import { createClient } from "../actions";
import { ClientForm } from "../client-form";

export default async function NovoClientePage() {
  const partners = await prisma.company.findMany({
    where: { roles: { has: "parceiro" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">Novo cliente</h1>
      <ClientForm action={createClient} partners={partners} />
    </div>
  );
}
