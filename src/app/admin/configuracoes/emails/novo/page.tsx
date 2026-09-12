import { createEmailTemplate } from "../actions";
import { TemplateForm } from "../template-form";

export default function NovoTemplatePage() {
  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">Novo template</h1>
      <TemplateForm action={createEmailTemplate} />
    </div>
  );
}
