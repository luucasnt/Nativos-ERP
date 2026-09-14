-- O ERP usa Prisma no servidor para todas as operações de negócio. O
-- cliente público precisa apenas do Supabase Auth; não deve conseguir
-- gravar diretamente nas tabelas do ERP mesmo quando possuir um JWT válido.
-- RLS continua habilitado como defesa adicional para acessos administrativos
-- e futuras integrações controladas.

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA "public" FROM "anon", "authenticated";
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "public" FROM "anon", "authenticated";
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "public" FROM "authenticated";

ALTER DEFAULT PRIVILEGES IN SCHEMA "public"
  REVOKE ALL ON TABLES FROM "anon", "authenticated";
ALTER DEFAULT PRIVILEGES IN SCHEMA "public"
  REVOKE ALL ON SEQUENCES FROM "anon", "authenticated";

-- O catálogo é somente leitura para integrações autenticadas futuras; o
-- aplicativo atual continua consumindo-o pelo Prisma.
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT SELECT ON TABLE "public"."catalog_items" TO "authenticated";
