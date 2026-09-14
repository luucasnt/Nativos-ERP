import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatasourceUrl() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);

    // O pool transacional do Supabase (porta 6543) não suporta prepared
    // statements. Estes parâmetros deixam cada função serverless com uma
    // conexão curta e evitam o erro 42P05 observado em produção.
    if (url.port === "6543") {
      url.searchParams.set("pgbouncer", "true");
      url.searchParams.set("connection_limit", "1");
      url.searchParams.set("pool_timeout", "10");
      url.searchParams.set("connect_timeout", "15");
    }

    return url.toString();
  } catch {
    // Mantém compatibilidade com formatos especiais de URL aceitos pelo
    // Prisma. A validação definitiva continua sendo feita pelo próprio client.
    return rawUrl;
  }
}

const datasourceUrl = getDatasourceUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
