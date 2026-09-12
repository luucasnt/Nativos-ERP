import { createClause } from "../actions";
import { ClauseForm } from "../clause-form";

export default function NovaClausulaPage() {
  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">Nova cláusula</h1>
      <ClauseForm action={createClause} />
    </div>
  );
}
