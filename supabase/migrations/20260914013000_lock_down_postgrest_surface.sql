-- O aplicativo usa Prisma no servidor para o ERP. Remova o data plane
-- direto do PostgREST para anon/authenticated e mantenha apenas catálogo
-- autenticado em leitura para integrações futuras.

revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
revoke insert, update, delete on all tables in schema public from authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

grant usage on schema public to authenticated;
grant select on table public.catalog_items to authenticated;
