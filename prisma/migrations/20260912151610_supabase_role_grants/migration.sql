-- Concede às roles padrão do Supabase (anon, authenticated, service_role)
-- os privilégios de tabela necessários para que as políticas de RLS
-- (migração row_level_security) tenham efeito prático via PostgREST/
-- supabase-js. Sem este GRANT, mesmo com RLS habilitado e políticas
-- corretas, o Postgres negaria acesso por falta de privilégio antes mesmo
-- de avaliar as políticas.
--
-- A conexão do backend Next.js via Prisma usa a role dona das tabelas
-- (bypassa RLS) e não depende destes grants.
--
-- Em projetos criados pelo dashboard/CLI do Supabase esses grants já vêm
-- configurados de fábrica; como este schema é gerenciado via Prisma
-- Migrate diretamente, precisam ser declarados aqui.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant all on tables to service_role;
