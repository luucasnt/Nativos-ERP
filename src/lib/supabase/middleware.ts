import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { AppMetadata } from "@/lib/auth/types";

const INTERNAL_PREFIX = "/admin";
const PORTAL_EMPRESA_PREFIX = "/portal/empresa";
const PORTAL_MOTORISTA_PREFIX = "/portal/motorista";
const PUBLIC_PATHS = ["/login", "/change-password", "/auth"];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  );
}

// Atualiza a sessão Supabase a cada requisição (necessário no App Router:
// o middleware é o único lugar em que o cookie de sessão pode ser
// renovado de forma confiável) e aplica um portão de autorização "grosso"
// por área (interno / portal empresa / portal motorista) usando os claims
// em app_metadata — sem precisar consultar o Postgres a partir do Edge.
// Regras finas (ex.: qual internal_role, quais roles da Company) ficam por
// conta das páginas/layouts de servidor, que têm acesso ao Prisma.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const metadata = user.app_metadata as Partial<AppMetadata>;

  if (metadata.must_change_password) {
    const changePasswordUrl = new URL("/change-password", request.url);
    return NextResponse.redirect(changePasswordUrl);
  }

  if (pathname.startsWith(INTERNAL_PREFIX) && metadata.account_type !== "internal") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    pathname.startsWith(PORTAL_EMPRESA_PREFIX) &&
    (metadata.account_type !== "portal" || !metadata.linked_company_id)
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    pathname.startsWith(PORTAL_MOTORISTA_PREFIX) &&
    (metadata.account_type !== "portal" || !metadata.linked_driver_id)
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}
