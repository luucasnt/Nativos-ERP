import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteClause, updateClause } from "../actions";
import { ClauseForm } from "../clause-form";
import { DeleteButton } from "@/components/admin/delete-button";

export default async function EditarClausulaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clause = await prisma.contractClause.findUnique({ where: { id } });

  if (!clause) {
    notFound();
  }

  async function handleDelete() {
    "use server";
    await deleteClause(id);
    redirect("/admin/configuracoes/contratos");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Editar cláusula</h1>
        <DeleteButton action={handleDelete} confirmMessage="Excluir esta cláusula?" />
      </div>
      <ClauseForm
        action={updateClause.bind(null, id)}
        defaultValues={{
          category: clause.category,
          order: clause.order,
          title: clause.title,
          content: clause.content,
          active: clause.active,
        }}
      />
    </div>
  );
}
