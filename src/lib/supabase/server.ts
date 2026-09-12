import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase para uso em Server Components, Server Actions e Route
// Handlers. Lê/grava a sessão nos cookies da requisição atual.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Chamado a partir de um Server Component sem permissão de
            // escrita de cookie — inofensivo quando o middleware já cuida
            // do refresh de sessão.
          }
        },
      },
    },
  );
}
