import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente com a service role key — ignora RLS. Uso exclusivo de código de
// servidor (Server Actions / Route Handlers) para operações administrativas
// como criar login de portal para parceiro/fornecedor/motorista, gerar
// senha temporária, etc. Nunca importar de um Client Component.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
