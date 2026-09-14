import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { AppMetadata } from "@/lib/auth/types";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const INTERNAL_PREFIX = "/admin";
const PORTAL_EMPRESA_PREFIX = "/portal/empresa";
const PORTAL_MOTORISTA_PREFIX = "/portal/motorista";
const PUBLIC_PATHS = ["/login", "/change-password", "/auth"];

// Nome do header interno que carrega o id do usuário já validado por
// `getClaims()` aqui no middleware, pra Server Components/Actions
// não precisarem revalidar a mesma sessão de novo (ver getCurrentUser()
// em src/lib/auth/get-current-user.ts). Nunca é lido de volta de um
// response nem exposto ao cliente — só existe dentro da requisição que o
// Next.js repassa pro servidor depois que o middleware roda, e qualquer
// valor vindo do próprio cliente é descartado antes de setarmos o nosso.
export const AUTH_USER_ID_HEADER = "x-nativos-auth-user-id";

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname === "/" ||
    pathname === "/robots.txt" ||
    pathname === "/manifest.webmanifest" ||
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
  const authHeaders = new Headers();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headersToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
            });
          }
          for (const [key, value] of Object.entries(headersToSet)) {
            authHeaders.set(key, value);
            supabaseResponse.headers.set(key, value);
          }
        },
      },
    },
  );

  // Com chaves assimétricas, a assinatura e a expiração são verificadas
  // localmente com JWKS em cache. Projetos com chave simétrica continuam
  // usando automaticamente a validação remota segura.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  // Descarta qualquer valor que o próprio cliente tenha tentado mandar
  // nesse header antes de decidir o valor de verdade — só depois disso
  // reconstruímos a resposta, preservando os cookies que `setAll` já
  // possa ter colocado em `supabaseResponse` (refresh de token).
  request.headers.delete(AUTH_USER_ID_HEADER);
  if (userId) {
    request.headers.set(AUTH_USER_ID_HEADER, userId);
  }
  const existingCookies = supabaseResponse.cookies.getAll();
  supabaseResponse = NextResponse.next({ request });
  for (const cookie of existingCookies) {
    supabaseResponse.cookies.set(cookie);
  }
  authHeaders.forEach((value, key) => supabaseResponse.headers.set(key, value));

  const { pathname } = request.nextUrl;
  const isLoginAttempt = request.method === "POST" && pathname === "/login";
  const isPdfRequest = pathname.startsWith("/api/documentos/");
  if (isLoginAttempt || isPdfRequest) {
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
    const ip = forwardedFor || request.headers.get("x-real-ip") || "unknown";
    const limit = pathname === "/login"
      ? consumeRateLimit(`login:${ip}`, 12, 60_000)
      : consumeRateLimit(`pdf:${ip}`, 30, 60_000);
    if (!limit.allowed) {
      return new NextResponse("Muitas tentativas. Aguarde e tente novamente.", {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" },
      });
    }
  }

  const redirectPreservingSession = (url: URL) => {
    const response = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      response.cookies.set(cookie);
    }
    authHeaders.forEach((value, key) => response.headers.set(key, value));
    return response;
  };

  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  if (!userId) {
    const loginPath = pathname.startsWith(PORTAL_MOTORISTA_PREFIX)
      ? "/login/motorista"
      : pathname.startsWith(PORTAL_EMPRESA_PREFIX)
        ? "/login/parceiro"
        : "/login/admin";
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set("next", pathname);
    return redirectPreservingSession(loginUrl);
  }

  const metadata = claims?.app_metadata as Partial<AppMetadata> | undefined;

  // Tokens antigos podem ainda não conter `status`; nesse caso a checagem
  // definitiva continua no Prisma. Tokens sincronizados de um usuário
  // desativado são barrados já na borda, antes de iniciar qualquer consulta.
  if (metadata?.status === "inativo") {
    return redirectPreservingSession(new URL("/login", request.url));
  }

  if (metadata?.must_change_password) {
    const changePasswordUrl = new URL("/change-password", request.url);
    return redirectPreservingSession(changePasswordUrl);
  }

  if (pathname.startsWith(INTERNAL_PREFIX) && metadata?.account_type !== "internal") {
    return redirectPreservingSession(new URL("/login", request.url));
  }

  if (
    pathname.startsWith(PORTAL_EMPRESA_PREFIX) &&
    (metadata?.account_type !== "portal" || !metadata.linked_company_id)
  ) {
    return redirectPreservingSession(new URL("/login", request.url));
  }

  if (
    pathname.startsWith(PORTAL_MOTORISTA_PREFIX) &&
    (metadata?.account_type !== "portal" || !metadata.linked_driver_id)
  ) {
    return redirectPreservingSession(new URL("/login", request.url));
  }

  return supabaseResponse;
}
