import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteEmailTemplate, updateEmailTemplate } from "../actions";
import { TemplateForm } from "../template-form";
import { DeleteButton } from "@/components/admin/delete-button";

export default async function EditarTemplatePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const template = await prisma.emailTemplate.findUnique({ where: { key } });

  if (!template) {
    notFound();
  }

  async function handleDelete() {
    "use server";
    await deleteEmailTemplate(key);
    redirect("/admin/configuracoes/emails");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Editar template</h1>
        <DeleteButton action={handleDelete} confirmMessage="Excluir este template de e-mail?" />
      </div>
      <TemplateForm
        action={updateEmailTemplate.bind(null, key)}
        defaultValues={{
          key: template.key,
          name: template.name,
          subject: template.subject,
          body: template.body,
          category: template.category,
          auto_send: template.auto_send,
          allowed_variables: (template.allowed_variables as string[] | null) ?? [],
        }}
      />
    </div>
  );
}
