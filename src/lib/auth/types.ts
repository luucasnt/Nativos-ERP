import type { AccountType, InternalRole, Role } from "@prisma/client";

// Espelha um subconjunto do model User em app_metadata do Supabase Auth
// (gravado apenas por código de servidor via service role — imutável pelo
// próprio usuário) para permitir checagens de rota rápidas em middleware
// (Edge) sem precisar consultar o Postgres a cada requisição. O Prisma
// `User` continua sendo a fonte da verdade; este claim é mantido em sincronia
// sempre que o cadastro do usuário é criado ou alterado.
export type AppMetadata = {
  user_id: string; // users.id (Prisma), não o auth_user_id
  role: Role;
  account_type: AccountType;
  internal_role: InternalRole | null;
  is_owner: boolean;
  linked_company_id: string | null;
  linked_driver_id: string | null;
  must_change_password: boolean;
};
