# Nativos ERP

Sistema de gestão da Nativos Experiences (turismo de luxo em Trancoso, BA).

Este repositório está sendo construído por fases, conforme o plano definido
na especificação funcional. **Este README reflete o estado ao final da
Fase 2 — Cadastros**, já incorporando 6 requisitos adicionais pedidos pelo
cliente após a confirmação da Fase 1 (ver seção "Requisitos adicionais
pós-Fase 1"). Não avance para os módulos das fases seguintes sem
confirmação explícita de que esta fase está correta.

## Stack

- Next.js 15 (App Router) + TypeScript
- Prisma ORM 6 + PostgreSQL (Supabase)
- Supabase Auth (3 tipos de conta: interno, portal empresa, portal motorista)
- Supabase Storage (comprovantes/contratos — a partir da Fase 7)
- Resend (e-mail transacional via outbox — a partir da Fase 7)
- @react-pdf/renderer (documentos — a partir da Fase 7)
- Vitest (testes de integração)

## O que existe na Fase 1

- **Schema Prisma completo** (`prisma/schema.prisma`) com todos os models
  descritos na especificação: usuários, cadastros base (Client, Driver,
  Vehicle, Company, CatalogItem), operacional (Reservation, Service), motor
  financeiro (FinanceEntry, Payment, DirectCollection, Compensation,
  BillingCycle, CashClosing, ClientCredit, BankAccount), portais/aprovação
  (ChangeRequest, Alert, PortalNotification, AuditLog, ServiceExpense) e
  comunicação/documentos (Communication, EmailTemplate, ContractClause,
  Setting).
- **Regras de banco não-negociáveis**, implementadas como trigger Postgres
  (não como validação de aplicação) — ver
  `prisma/migrations/20260912150700_financial_integrity_triggers`:
  - `BEFORE DELETE` em `finance_entries`, `payments`, `compensations` e
    `direct_collections` sempre lança exceção — nem um usuário com
    privilégio máximo consegue apagar essas linhas.
  - `BEFORE UPDATE OR DELETE` em `audit_logs` sempre lança exceção
    (append-only).
- **Idempotência real**: todo campo `dedupe_key` / `idempotency_key` /
  `auto_key` da especificação é `@unique` no schema Prisma, virando
  constraint `UNIQUE` de banco (não apenas convenção).
- **Row Level Security** (`prisma/migrations/20260912151359_row_level_security`)
  em todas as tabelas: acesso interno é completo; acesso de portal (empresa
  ou motorista) é restrito às próprias linhas via `app_metadata` do JWT do
  Supabase Auth. Ver "Arquitetura de autorização" abaixo.
- **Autenticação Supabase** para as 3 frentes de login (interno, portal
  empresa — parceiro e/ou fornecedor —, portal motorista), incluindo o
  fluxo de primeiro acesso com senha temporária (`must_change_password`).
- **Identidade visual base**: paleta (`#233b35` / `#c9a978` / `#f8f5ee`),
  tipografia (Cormorant Garamond + Jost) e um componente de logo
  placeholder — ver "Pendências" abaixo, o arquivo real da marca ainda não
  foi recebido.
- **Seed de dados de teste** (`prisma/seed.ts`) cobrindo as 3 variáveis
  comerciais independentes (execução própria/fornecedor, cobrança
  Nativos/direta/faturada, com/sem indicação), incluindo o caso de
  dono-fornecedor que também dirige.
- **Testes de integridade** (`tests/db/financial-integrity-triggers.test.ts`)
  que provam, contra um Postgres real, que as regras de DELETE bloqueado,
  append-only e UNIQUE de idempotência realmente funcionam no banco.

## O que existe na Fase 2

- **CRUD administrativo completo** para Clientes, Empresas (parceiro e/ou
  fornecedor), Motoristas e Veículos (`src/app/admin/*`), com validação via
  Zod e trilha de auditoria (`logAudit`) em toda criação/edição.
- **Fluxo de aprovação de cadastro vindo de portal**: motoristas/veículos
  criados por um fornecedor pelo portal nascem com `approval_status:
  pendente`; `/admin/aprovacoes` lista tudo pendente e cada tela de edição
  tem os botões Aprovar/Rejeitar.
- **Painel de Configurações** (`/admin/configuracoes`): catálogo (as 9
  taxonomias de `CatalogItem`, com abas), templates de e-mail, cláusulas de
  contrato, padrão de exibição de valor em documentos, comissões padrão por
  categoria de cadastro e usuários internos — tudo editável sem alterar
  código.

## Requisitos adicionais pós-Fase 1

Depois de confirmar a Fase 1, o cliente pediu 6 acréscimos, já incorporados
nesta fase:

1. **Plaquinha de recepção**: `Service.reception_sign_enabled` (opcional,
   por serviço) + `Service.reception_passenger_name`. A geração do PDF em
   si é Fase 7 (documentos); o campo de configuração já existe no schema.
2. **Voucher com valor opcional**: `Reservation.voucher_show_price`
   (`Boolean?` — `null` usa o padrão global). Padrão global em
   `Setting["documentos_exibicao_valor"].voucher_default`, editável em
   `/admin/configuracoes/documentos` (padrão: `false`, sem valor visível).
3. **Ordem de serviço com valor opcional**: mesma lógica do item 2, só que
   por serviço — `Service.os_show_price` + `os_default` na mesma
   configuração global.
4. **Painel de configuração geral**: módulo "Configurações" descrito acima.
   Cobre catálogo, templates, exibição de documento e comissões padrão. Não
   cobre uma reformulação completa de papéis/permissões além do que já
   existia (`role`/`account_type`/`internal_role`) — ver "Pendências".
5. **Criação de login simplificada**: um botão único ("Criar acesso ao
   portal") nas telas de Empresa e Motorista
   (`src/components/admin/portal-login-panel.tsx`), que chama
   `provisionCompanyOrDriverLogin` (`src/lib/auth/provision-user.ts`). Esse
   helper resolve sozinho o caso de dono-fornecedor que também dirige
   (`is_company_owner_driver`): criar o acesso pelo lado da empresa ou pelo
   lado do motorista dá exatamente no mesmo — um único login, nunca
   duplicado.
6. **Autonomia do dono do fornecedor sobre os serviços dos seus
   motoristas**: `startService`/`completeService`
   (`src/lib/services/service-execution.ts`) autorizam tanto o motorista
   atribuído quanto qualquer usuário de portal ligado à empresa
   fornecedora daquele serviço (`service.supplier_id`) — não só o próprio
   motorista. Exposto no portal (`/portal/motorista` e `/portal/empresa`)
   com uma lista mínima de serviços e botões Iniciar/Finalizar; a
   experiência completa do portal fica para a Fase 5.

## Arquitetura de autorização

O backend fala com o Postgres via Prisma usando a role dona das tabelas —
que ignora RLS por padrão no Postgres. Autorização fina (quem pode ver ou
alterar o quê) é feita em código de servidor (Server Components/Actions),
usando o registro `User` do Prisma como fonte da verdade
(`src/lib/auth/get-current-user.ts`).

O RLS existe como camada de defesa adicional para qualquer acesso direto ao
Supabase (PostgREST, GraphQL, Realtime ou `supabase-js` no navegador), que o
Supabase expõe por padrão para toda tabela do schema `public`. As políticas
usam claims em `app_metadata` do JWT (`account_type`, `linked_company_id`,
`linked_driver_id` etc.), mantidos em sincronia com a tabela `users` por
`src/lib/auth/provision-user.ts::syncAppMetadata`.

O middleware (`src/middleware.ts`) faz duas coisas: renova a sessão Supabase
a cada requisição e aplica um portão de autorização "grosso" por área
(`/admin`, `/portal/empresa`, `/portal/motorista`) usando os mesmos claims —
sem consultar o Postgres a partir do Edge runtime, onde o Prisma não roda.

## Rodando localmente

### 1. Banco de dados

Em desenvolvimento local sem um projeto Supabase, use um Postgres local:

```bash
createdb nativos_erp_dev
createdb nativos_erp_shadow   # usado só pelo Prisma Migrate para validar migrações
```

Copie `.env.example` para `.env` e ajuste `DATABASE_URL` / `DIRECT_URL` /
`SHADOW_DATABASE_URL` conforme necessário.

> **Nota sobre `auth.uid()` / `auth.jwt()`:** as políticas de RLS
> referenciam essas funções, que o Supabase já fornece nativamente em
> qualquer projeto real. Um Postgres local puro não as tem — para testar
> RLS localmente, crie um schema `auth` de teste com stubs equivalentes
> (não faz parte de nenhuma migração deste repositório, porque não deve
> ser aplicado a um projeto Supabase real, que já tem as funções de
> verdade):
>
> ```sql
> create schema if not exists auth;
> create function auth.uid() returns uuid language sql stable as $$
>   select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
> $$;
> create function auth.jwt() returns jsonb language sql stable as $$
>   select nullif(current_setting('request.jwt.claims', true), '')::jsonb;
> $$;
> create role authenticated; create role anon; create role service_role;
> grant usage on schema auth to anon, authenticated, service_role;
> grant execute on function auth.uid() to anon, authenticated, service_role;
> grant execute on function auth.jwt() to anon, authenticated, service_role;
> ```

### 2. Instalar dependências e aplicar migrações

```bash
npm install
npm run prisma:migrate   # aplica as migrações em desenvolvimento
npm run prisma:seed      # popula dados de teste
```

### 3. Rodar a aplicação

```bash
npm run dev
```

Sem um projeto Supabase real configurado (`NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`), o login não
funciona — o seed avisa isso e pula a criação dos logins de teste. Configure
um projeto Supabase e rode `npm run prisma:seed` novamente para provisionar:
- um login interno (owner/admin)
- um login de portal empresa (o fornecedor "Transportes Costa do
  Descobrimento")
- um login de portal motorista (o motorista próprio "Carlos Andrade")

As senhas temporárias são impressas no console do seed (cada usuário
recebe `must_change_password = true` e é redirecionado para
`/change-password` no primeiro login).

### 4. Testes

```bash
npm test
```

## Pendências / decisões que precisam de confirmação antes da Fase 2

A especificação instrui a nunca inventar campo ou regra de negócio sem
perguntar. As decisões abaixo foram tomadas para que o schema de fundação
fosse utilizável, mas ficam marcadas com `// INFERIDO:` no
`schema.prisma` e devem ser revisadas:

1. **Arquivo de logo**: o cliente compartilhou uma imagem do wordmark
   "nativos" (verde-floresta/creme, itálico serifado, com o ponto do "i"
   estilizado como círculo) diretamente na conversa, mas nenhum arquivo
   chegou a ser anexado à sessão (sem arquivo salvo em disco para copiar
   bit a bit). `src/components/brand/logo.tsx` reproduz esse wordmark com
   texto real (Cormorant Garamond) + um círculo decorativo posicionado em
   `em`, o que escala corretamente em qualquer tamanho — mas é uma
   reprodução visual, não o arquivo original. O favicon
   (`src/app/icon.tsx`) usa só o monograma "n", gerado em build/request
   time via `next/og`. Se a fidelidade pixel-a-pixel importar, troque por
   um arquivo de imagem real assim que ele for anexado como arquivo (não
   apenas colado na conversa).
2. **Status de `Reservation`** (`ReservationStatus`) e **status de
   execução de `Service`** (`ServiceExecutionStatus`): a especificação diz
   que o status da reserva é "calculado automaticamente a partir dos
   serviços vinculados", mas não lista os valores possíveis nem o
   algoritmo de cálculo. Os enums criados (`aguardando_confirmacao`,
   `confirmada`, `em_andamento`, `concluida`, `cancelada`,
   `parcialmente_cancelada` / `agendado`, `em_andamento`, `concluido`,
   `cancelado`) são um ponto de partida razoável — o algoritmo de cálculo
   fica para a Fase 3 (Operacional).
3. **Campos operacionais mínimos em `Service`** (data/hora agendada,
   local de origem/destino, número de passageiros, número de voo): não
   estão itemizados na especificação (que foca em preço/desconto/bagagem/
   cadeirinha/aceite), mas são estruturalmente necessários para um
   transfer/passeio/disposição existir. Ficam sujeitos a expansão na Fase 3.
4. **Contraparte de `FinanceEntry`** (`party_type` / `party_id`): a
   especificação não lista explicitamente de quem é a favor/contra um
   lançamento — só descreve tipo/categoria/status/origem. Sem esse campo o
   razão não seria navegável, então foi adicionado.
5. **`temp_password` do `User`**: a especificação menciona um campo
   `temp_password`, mas armazenar senha em texto plano no banco é uma
   vulnerabilidade (OWASP). A senha temporária é gerada e devolvida uma
   única vez por `generateTemporaryPassword()`
   (`src/lib/auth/provision-user.ts`) para quem criou o cadastro comunicar
   ao usuário — só o Supabase Auth guarda a senha (com hash), e `users`
   guarda apenas o booleano `must_change_password`.
6. **Catálogo de ações do `AuditLog`**: a especificação fala em "mais de
   50 tipos de ação catalogados" mas só dá ~20 exemplos. Em vez de inventar
   os ~30 restantes, `action` ficou como `String` livre (não um enum
   fechado) até o catálogo completo ser definido.
7. **Segurança conhecida das dependências**: `npm audit` aponta 2
   vulnerabilidades em ferramentas de build/dev (PostCSS embutido no
   Next.js 15.x, `deepmerge-ts` embutido no `@prisma/config`) — ambas só
   afetam o processo de build/CLI, não código servido em produção, e a
   correção automática (`npm audit fix --force`) exigiria sair das versões
   fixadas pela stack obrigatória (Next.js 15 e Prisma 6). Deixadas como
   estão, documentadas aqui.

## Próximas fases

Conforme o plano de construção, a Fase 3 (Operacional: reservas + serviços,
fluxo de aceite do fornecedor, cálculo automático de status, desconto,
imposto/nota fiscal) só deve começar após confirmação de que esta fase
está correta. Dois pontos já sinalizados na Fase 1 seguem em aberto e
seriam naturalmente resolvidos na Fase 3: o algoritmo de cálculo de
`ReservationStatus`/`ServiceExecutionStatus`, e a extensão dos campos
operacionais de `Service` (data/hora, locais, passageiros) conforme o
fluxo completo de reserva for desenhado.
