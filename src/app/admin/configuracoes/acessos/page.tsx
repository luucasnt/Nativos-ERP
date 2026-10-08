import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { AccessRow } from "./access-row";

export default async function AccessesPage() {
  const actor = await getCurrentUser();
  if (!actor?.is_owner || actor.role !== "admin") redirect("/admin/configuracoes");
  const users = await prisma.user.findMany({
    where: { account_type: "portal" }, orderBy: { created_at: "desc" }, take: 300,
    select: { id: true, email: true, status: true, linked_company: { select: { name: true, roles: true } }, linked_driver: { select: { name: true } } },
  });
  return <div className="space-y-6">
    <header><p className="eyebrow">Segurança e operação</p><h1 className="page-heading mt-1">Central de acessos</h1><p className="page-description">Visualize, ative, desative e redefina os logins dos portais sem abrir cada cadastro.</p></header>
    {users.length === 0 ? <div className="surface-panel p-8 text-center text-sm text-forest/60">Nenhum acesso de portal criado.</div> : <div className="grid gap-3 md:grid-cols-2">{users.map(user => <AccessRow key={user.id} id={user.id} email={user.email} status={user.status} label={user.linked_driver?.name ?? user.linked_company?.name ?? "Acesso sem vínculo"} detail={[user.linked_company?.roles.includes("fornecedor") ? "Fornecedor" : user.linked_company?.roles.includes("parceiro") ? "Parceiro" : null, user.linked_driver ? "Motorista" : null].filter(Boolean).join(" · ")} />)}</div>}
  </div>;
}
