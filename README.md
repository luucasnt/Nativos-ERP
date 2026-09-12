# Nativos ERP

Sistema de gestão da Nativos Experiences (turismo de luxo em Trancoso, BA).

Este repositório está sendo construído por fases, conforme o plano definido
na especificação funcional. **Este README reflete o estado ao final da
Fase 3 — Operacional**, sobre uma Fase 2 (Cadastros) que já incorporou 6
requisitos adicionais pedidos pelo cliente após a confirmação da Fase 1
(ver seção "Requisitos adicionais pós-Fase 1"). Não avance para os módulos
das fases seguintes sem confirmação explícita de que esta fase está
correta.

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

## O que existe na Fase 3

- **CRUD de Reservas + Serviços aninhados** (`/admin/reservas`): criar
  reserva (cliente, parceiro de origem, indicação com comissão individual,
  cortesia/NET/NF, modo de cobrança), adicionar/editar serviços dentro dela
  (tipo, execução própria/fornecedor, motorista/veículo, agenda, bagagem,
  cadeirinha, disposição, desconto, plaquinha de recepção, exibição de
  valor na OS).
- **`collection_actor`** (`src/lib/reservations/pricing.ts`): campo que
  faltava desde a Fase 1 — a spec o descreve explicitamente ("derivado de
  collection_mode + execution_type — quem cobra o passageiro de fato") mas
  ele não tinha sido modelado. Adicionado com migração + backfill dos
  dados já existentes.
- **Sistema de desconto** (`computeServicePrice`): `original_price` nunca
  é editado depois de definido (a UI de edição só mostra o valor, sem
  input); só o desconto recalcula `price`. `supplier_cost` é um campo
  totalmente independente, nunca tocado por essa função — coberto por
  teste de integração real contra Postgres.
- **Cálculo automático de status da reserva**
  (`src/lib/reservations/status.ts`, `status-pure.ts`): resolve a
  pendência da Fase 1. Enum revisado e aprovado pelo cliente: `rascunho`,
  `pendente`, `confirmado`, `em_andamento`, `concluido`, `cancelado`,
  `rejeitado` (este último não é alcançado pelo algoritmo automático — fica
  reservado para uma ação manual de rejeitar a reserva inteira, ainda não
  construída). Recusa de fornecedor cai em `pendente` (mesma ação de
  reatribuir e seguir que "aguardando aceite"). Cancelamento parcial não
  ganhou um status próprio — é um campo booleano independente,
  `has_partial_cancellation`, calculado junto com o status mas sem
  substituir nenhum dos 7 valores do enum. Algoritmo com 10 cenários
  testados.
- **Cálculo de imposto/NF** (`src/lib/reservations/tax.ts`): resolve a
  outra pendência da Fase 1, com uma correção pedida pelo cliente na
  revisão — não existe alíquota "de fábrica" em lugar nenhum. Uma reserva
  com `requires_nf` só calcula imposto depois que uma alíquota é definida
  manualmente: pelo padrão global (`/admin/configuracoes/impostos`, vazio
  até o admin preencher) ou diretamente naquela reserva (sobrepõe o
  padrão, editável no formulário de reserva). Sem nenhuma das duas,
  `tax_percent_snapshot`/`tax_amount`/`nf_value` ficam `null` — nada é
  calculado nem "chutado". Uma vez que uma alíquota existe e é usada pela
  primeira vez, fica congelada; mudar o padrão global depois não afeta
  reservas já calculadas.
- **Fluxo de aceite do fornecedor**: `aguardando_aceite -> aceito/recusado`
  (`src/lib/reservations/acceptance.ts`), acionável tanto pelo admin
  (registro interno, ex.: confirmação por telefone) quanto pelo próprio
  fornecedor no portal (`/portal/empresa`, com motivo obrigatório na
  recusa). Um serviço não pode ser iniciado (`startService`) antes de
  aceito.

## O que existe na Fase 4

Motor financeiro completo (spec seção 6 — as 3 variáveis comerciais
independentes: quem executa, quem cobra, se há indicação/comissão). Nenhuma
regra de negócio nova roda por conta própria: tudo é acionado a partir dos
mesmos marcos operacionais já existentes (aceite do fornecedor, conclusão
do serviço), pelos mesmos caminhos usados pelo admin e pelos portais.

- **Primitivas do razão** (`src/lib/finance/ledger.ts`): `createFinanceEntry`
  (idempotente por `auto_key`), `markFinanceEntryEligible` (o único lugar
  que liga `payment_eligible = true`), `cancelUnpaidFinanceEntry`,
  `reverseFinanceEntry` (estorno: cria um lançamento novo de tipo oposto,
  nunca apaga o original), `createPayment`/`reversePayment` (idempotentes
  por `dedupe_key`), `createDirectCollection`, `createCompensation`
  (idempotente por `idempotency_key`). Nenhuma função aqui — nem em nenhum
  outro lugar do sistema — apaga fisicamente `FinanceEntry`, `Payment`,
  `Compensation` ou `DirectCollection`: o trigger de banco da Fase 1
  (`prisma/migrations/20260912150700_financial_integrity_triggers`) barra a
  tentativa mesmo que o código tentasse.
- **Motor de liquidação por serviço** (`src/lib/finance/settlement.ts`):
  `computeServiceSettlementEntries` é uma função pura que decide, a partir
  de `execution_type` + `collection_actor` (derivado de `collection_mode`) +
  `is_cortesia` + o modo de acerto do fornecedor, quais lançamentos nascem
  para aquele serviço — 17 cenários testados
  (`tests/finance/settlement.test.ts`), incluindo toda a combinatória de
  cortesia. `generateServiceFinanceEntries` orquestra isso contra o banco de
  forma idempotente: enquanto um lançamento segue `programado` (rascunho),
  reeditar o serviço ajusta o mesmo registro; uma vez que ele avança para
  `pendente`/`pago`/`cancelado`, uma nova geração nunca sobrescreve o valor
  em silêncio — só uma reversão formal altera um lançamento já finalizado.
  `markServiceFinanceEntriesEligible` é chamada exclusivamente quando o
  serviço atinge `concluido` (regra não-negociável da spec) e, no caso
  específico de fornecedor com acerto "repassa bruto" em cobrança direta,
  também dispara `createCompensation` automaticamente para o único par
  determinístico que a spec descreve (repasse ao fornecedor × pagamento ao
  fornecedor da mesma reserva/serviço) — não é uma ferramenta geral de
  compensação de razão.
- **Comissões no nível da reserva** (`src/lib/finance/commissions.ts`):
  `recalculateReservationCommissions` calcula `comissao_parceiro` (a partir
  de `Company.commission_percent`, se `origin_partner_id` e
  `commission_enabled`) e `comissao_indicacao` (a partir de
  `Reservation.commission_percent`, se houver indicador) sobre a soma do
  `price` dos serviços não cancelados — nenhuma das duas roda em tarifa NET
  ou cortesia. `markReservationCommissionsEligible` só é chamada quando o
  status calculado da reserva chega a `concluido`.
- **Fiação no ciclo de vida existente**: `acceptService` agora chama
  `generateServiceFinanceEntries`; `rejectService` chama
  `cancelServiceFinanceEntries` defensivamente; `completeService` (portal)
  e as Server Actions de serviço/reserva do admin chamam
  `markServiceFinanceEntriesEligible`/`markReservationCommissionsEligible`/
  `recalculateReservationCommissions` nos mesmos pontos. Ao editar campos da
  reserva que alimentam a fórmula de liquidação (`collection_mode`,
  indicação, cortesia), os lançamentos `programado` de todo serviço já
  aceito são recalculados.
- **Painel `/admin/financeiro`**: lista somente-leitura dos `FinanceEntry`
  (mais recentes primeiro, contraparte resolvida por nome), com totais de
  receita/despesa não cancelada e uma ação de "Registrar pagamento" para
  lançamentos já elegíveis e `pendente` — chama `createPayment` com
  `dedupe_key = manual:<entryId>` (determinístico: um clique duplo ou um
  retry de rede nunca duplica o pagamento). Não há edição de valor nem de
  categoria nesta tela — isso seria alterar um lançamento já gerado pelo
  motor, o que a spec proíbe fora de uma reversão formal.
- **Suite de integridade obrigatória**: `tests/finance/settlement.test.ts`
  (17 testes, puro) cobre a combinatória das 3 variáveis comerciais.
  `tests/finance/lifecycle.test.ts` (13 testes, contra Postgres real) prova,
  através do motor — não só via SQL cru — que: nenhum lançamento existe
  antes do aceite; `payment_eligible` só vira `true` depois do marco de
  conclusão; cancelar um serviço cancela (nunca apaga) seus lançamentos;
  recusa não gera lançamento; regenerar é idempotente e nunca sobrescreve
  um valor já elegível/pago; o DELETE físico continua bloqueado mesmo para
  um lançamento criado pelo motor; `reverseFinanceEntry` e `createPayment`
  são idempotentes e nunca apagam nada; o repasse por diária/salário
  mensal é deduplicado por motorista/período mesmo com vários serviços
  concluídos no mesmo dia/mês; e o registro de rastreio de cortesia nasce
  fechado e nunca duplica numa regeneração posterior.

## O que existe na Fase 5

Portais externos completos (parceiro, fornecedor, motorista) — item 5 do
plano de construção. Escopo combinado com o cliente antes de começar: só
visualização e ações que já têm um caminho direto no modelo hoje (aceitar/
recusar serviço, iniciar/finalizar, registrar despesa, confirmar
recebimento direto, cadastrar motorista/veículo); a criação de
`ChangeRequest` (solicitar nova reserva/alteração/cancelamento/repasse,
com aprovação e SLA) fica inteiramente para a Fase 6, junto com o resto do
"fluxo de aprovação + alertas".

- **Portal do parceiro** (`/portal/empresa`, papel `parceiro`): antes só
  mostrava um cabeçalho vazio para quem não era fornecedor. Agora lista as
  reservas vinculadas (`Reservation.origin_partner_id`) e um extrato
  financeiro somente-leitura da própria contraparte no razão.
- **Portal do fornecedor**: ganhou (a) confirmação de recebimento direto
  (ver abaixo), (b) extrato financeiro somente-leitura, e (c) cadastro de
  motorista/veículo pelo próprio portal — nascem `terceirizado`,
  vinculados à empresa logada, `created_from_portal=true`, pendentes de
  aprovação do admin (mesmo fluxo já existente desde a Fase 2). O
  formulário de motorista não expõe `payment_type`/comissão/diária —
  termos financeiros que continuam de controle exclusivo do admin (ver
  item 16 abaixo).
- **Portal do motorista**: ganhou (a) registro de despesa por serviço
  (`ServiceExpense` — categoria, valor, link de comprovante), (b)
  confirmação de recebimento direto, e (c) extrato financeiro próprio.
- **`ServiceExpense`** (`src/lib/finance/expenses.ts`): motorista registra
  pelo portal (`pendente`); admin aprova/rejeita em `/admin/despesas`.
  Aprovar gera automaticamente um `FinanceEntry` (despesa,
  `despesa_servico`, já elegível a pagamento — não há marco operacional
  futuro para esperar, a própria aprovação já é o marco) — idempotente
  (`ServiceExpense.finance_entry_id` é único; aprovar de novo não duplica).
  Rejeitar grava o motivo e não gera nenhum lançamento; uma despesa já
  decidida não pode ser decidida de novo.
- **Confirmação de recebimento direto** (`src/lib/finance/direct-collection.ts`,
  `DirectCollection`): quando `collection_actor` do serviço é
  `motorista_proprio` ou `fornecedor`, o portal correspondente (motorista
  ou empresa) pode confirmar "recebi o valor" ou "não recebi" (com motivo
  catalogado) depois do serviço concluído. Idempotente por
  `idempotency_key`. "Não recebido" fica registrado como fato — não
  reverte nem cancela automaticamente o `FinanceEntry` de repasse
  correspondente (ver item 17 abaixo).
- **Sino de notificação** (`src/lib/notifications.ts`,
  `PortalNotification`): bell no cabeçalho dos dois portais, com contagem
  de não lidos, marcar-como-lido individual e "marcar todos". Disparado em
  4 pontos concretos: `novo_servico` (fornecedor recebe um serviço novo/
  reatribuído aguardando aceite), `servico_atribuido` (motorista recebe
  um serviço novo/reatribuído), `despesa_rejeitada` (motorista, quando o
  admin rejeita sua despesa) e `repasse_confirmado` (motorista/fornecedor,
  quando o admin registra um pagamento de despesa a favor deles em
  `/admin/financeiro`). Os demais tipos do enum (`reserva_confirmada`,
  `alteracao_aprovada`, `cancelamento_aprovado`, `pagamento_confirmado`,
  `comprovante_aprovado`, `solicitacao_atualizada`) não têm gatilho ainda
  — dependem de fluxos que só existem a partir da Fase 6 (ChangeRequest) ou
  da Fase 7 (documentos/faturamento).
- **Suite de integridade**: `tests/finance/expenses.test.ts` (4 testes,
  Postgres real) cobre aprovação/rejeição/idempotência do `ServiceExpense`.
  `tests/finance/direct-collection.test.ts` (3 testes) cobre a
  confirmação de recebimento para os dois `collection_actor` aplicáveis e
  o DELETE físico continuar bloqueado. `tests/notifications.test.ts` (5
  testes) cobre o sino ponta a ponta.

## O que existe na Fase 6

Fluxo de aprovação + alertas + auditoria (item 6 do plano) — os quatro
pontos que ficaram pendentes da Fase 5.

- **`ChangeRequest` completo para os 3 portais**
  (`src/lib/change-requests/`): formulários de solicitar nova reserva,
  alteração e cancelamento (portal do parceiro) e solicitar repasse
  (portal do fornecedor e do motorista). `submit.ts` gera o protocolo
  (`SOL-{ano}-{sequencial}`) e é idempotente por `dedupe_key` — gerado uma
  vez por carregamento do formulário (`crypto.randomUUID()` no componente
  de servidor), não a cada clique, então um duplo clique ou um retry de
  rede nunca cria protocolo duplicado. `sla.ts` calcula o prazo de
  resposta (operacional = 30min, financeiro = 2h) puramente a partir de
  `created_at` + categoria — não existe campo de deadline gravado no
  banco. `/admin/solicitacoes`: lista tudo com o prazo (e um selo "fora do
  prazo" quando estourado), e uma revisão genérica (mudar status + nota de
  resposta) que **não** aciona nenhuma automação sobre reserva/serviço/
  financeiro — aprovar uma alteração/cancelamento/repasse só registra a
  decisão; a mudança de fato continua sendo feita pelo admin nas telas já
  existentes (Fases 3/4), com toda a validação que elas já têm.
- **Botão "rejeitar reserva inteira"** (`src/lib/reservations/rejection.ts`):
  finalmente implementado, adiado desde a Fase 3. `status = rejeitado` é
  uma ação manual fora do algoritmo automático — `computeReservationStatus`
  nunca produz nem desfaz esse valor sozinho, e `recalculateReservationStatus`
  agora verifica isso primeiro: uma vez rejeitada, editar os serviços da
  reserva não a reabre silenciosamente. Cancela (nunca apaga) os
  lançamentos ainda não pagos de cada serviço.
- **`AuditLog` append-only via trigger de banco**: já estava pronto desde
  a Fase 1 (`prisma/migrations/20260912150700_financial_integrity_triggers`,
  testado em `tests/db/financial-integrity-triggers.test.ts`) — nenhum
  trabalho novo aqui, só confirmando que a suite continua passando.
- **`Alert`** (`src/lib/alerts.ts`, `src/lib/alerts/detectors.ts`):
  idempotente por `dedupe_key` — a mesma condição nunca duplica; se o
  alerta já foi arquivado manualmente e a condição volta a acontecer,
  reabre em vez de colidir com a constraint (ver item 22 abaixo).
  `/admin/alertas` lista os ativos com severidade e um botão de arquivar
  manual — nenhuma condição se resolve sozinha. Dos 17 tipos catalogados,
  5 têm detecção automática, todos sem inventar limite/threshold nem
  depender de um job agendado (que este projeto ainda não tem):
  `despesa_motorista_pendente` (toda despesa registrada pelo portal),
  `solicitacao_alteracao`/`solicitacao_cancelamento` (todo `ChangeRequest`
  desses tipos), `fornecedor_recusou_sem_aceite` (toda recusa de serviço),
  `conflito_motorista_veiculo` (mesmo motorista/veículo, mesma data e
  mesmo horário exato em dois serviços) e `parceiro_acima_limite`
  (saldo em aberto ≥ `Company.billing_limit`, campo que já existe no
  schema). Os outros 12 ficam catalogados no enum, sem gatilho — ver item
  23.
- **Suite de integridade**: `tests/change-requests/sla.test.ts` (8 testes,
  puro) cobre a classificação por categoria e o cálculo de prazo/atraso.
  `tests/change-requests/lifecycle.test.ts` (4 testes, Postgres real)
  cobre protocolo sequencial, idempotência por `dedupe_key`, e a
  notificação certa ao requerente (empresa ou motorista) em cada decisão.
  `tests/alerts.test.ts` (3 testes) e `tests/alerts/detectors.test.ts` (4
  testes) cobrem idempotência/reabertura de alerta e os 2 detectores mais
  não-triviais (conflito de agenda, limite de faturamento).
  `tests/reservations/rejection.test.ts` (3 testes) cobre a rejeição de
  reserva inteira e a blindagem contra reabertura automática.

## O que existe na Fase 7

Documentos PDF + comunicação (item 7 do plano). Escopo combinado com o
cliente antes de começar: dos 8 tipos de documento da spec, só os 5 que já
tinham todo o dado necessário modelado (voucher, ordem de serviço,
recibo, contrato, orçamento) — fatura parcial/mensal fechada ficam para
quando o `BillingCycle` for construído (ainda não decidido em que fase), e
"relatório" fica para a Fase 8 (painel de relatórios), para não duplicar
escopo.

- **Identidade visual em PDF** (`src/lib/documents/`): paleta
  (`brand.ts`) e fontes (`register-fonts.ts`) idênticas ao resto do
  app — Cormorant Garamond (títulos) + Jost (corpo), verde-floresta
  `#233b35`/dourado `#c9a978`/creme `#f8f5ee`. As fontes foram baixadas do
  Google Fonts uma vez e vendorizadas em `src/lib/documents/fonts/*.ttf`
  (arquivos binários no repo) — @react-pdf/renderer não roda no DOM, não
  enxerga o `next/font` já usado no resto do app, e gerar PDF não deveria
  depender de uma chamada de rede a um serviço de fontes de terceiros no
  momento do request. O wordmark "nativos" (`components/wordmark-pdf.tsx`)
  reproduz o mesmo texto itálico + círculo decorativo do componente React
  da Fase 1 (`src/components/brand/logo.tsx`), só que com offsets em pt em
  vez de `em` (o layout do react-pdf não entende unidades relativas a
  fonte). `DocumentShell` (`components/document-shell.tsx`) é o cabeçalho/
  rodapé compartilhado pelos 5 documentos; a plaquinha de recepção usa um
  layout próprio, deliberadamente diferente (ver item 27 abaixo).
- **Voucher e OS respeitam o toggle de valor opcional da Fase 2** —
  `Reservation.voucher_show_price`/`Service.os_show_price` sobrepõem o
  padrão global (`Setting "documentos_exibicao_valor"`), reaproveitando a
  mesma configuração sem duplicar lógica
  (`src/lib/documents/price-visibility.ts`). Orçamento sempre mostra o
  valor (não haveria orçamento sem preço); recibo mostra o valor do
  `Payment` (é o próprio propósito do documento).
- **Rotas de geração**: `/api/documentos/{voucher,orcamento,contrato}/[reservationId]`,
  `/api/documentos/{os,plaquinha}/[serviceId]`,
  `/api/documentos/recibo/[paymentId]` — todas devolvem o PDF direto
  (`renderToBuffer`), sem persistir em Storage (ver item 29 abaixo).
  Voucher e OS aceitam tanto a equipe interna quanto o portal do
  parceiro/fornecedor/motorista dono daquele recurso; recibo/contrato/
  orçamento ficam só com a equipe interna (ver item 28). Links de
  download já plugados em `/admin/reservas/[id]` (voucher/orçamento/
  contrato), na tela de serviço (OS/plaquinha), em `/admin/financeiro`
  (recibo de um lançamento pago) e nos dois portais externos (voucher
  para o parceiro, OS para motorista/fornecedor).
- **Outbox real de e-mail** (`src/lib/communication/outbox.ts`):
  `enqueueCommunication` só grava a fila (idempotente por
  `idempotency_key`, exige um `EmailTemplate` ativo); `processOutboxOnce`
  é quem manda de verdade pelo Resend, com retry por `attempts` (limite 5)
  — nunca chamado inline no mesmo request que enfileira. Disparado por
  `POST/GET /api/outbox/process` (protegido por `CRON_SECRET`), agendado
  via `vercel.json` (Vercel Cron) em produção — hoje 1x/dia (`0 3 * * *`),
  por causa do limite do plano Hobby (só 1 execução/dia por cron); revisar
  para `*/5 * * * *` quando houver upgrade para o plano Pro — e por um
  botão manual em `/admin/configuracoes/outbox` (que também lista o log
  completo: status, tentativas, último erro), que é o caminho principal
  de disparo enquanto o cron só roda 1x/dia. Sem `RESEND_API_KEY`
  configurada nesta sessão de desenvolvimento (mesma situação do Supabase
  em fases anteriores), todo envio real falha com um erro claro — a fila e
  o retry funcionam de verdade, só o envio de fato depende de uma conta
  Resend real.
- **Sino + e-mail automático**: `src/lib/notifications.ts` agora
  enfileira um e-mail junto com toda notificação de portal cujo `type`
  bata com a `key` de um `EmailTemplate` ativo com `auto_send=true` —
  convenção que já existia no seed desde a Fase 1/2
  (`reserva_confirmada`, `alteracao_aprovada`, `cancelamento_aprovado`,
  `pagamento_confirmado`). Isso dá e-mail automático de graça para
  `alteracao_aprovada`/`cancelamento_aprovado` (Fase 6) sem precisar
  tocar em cada callsite — só os que já tinham template correspondente
  ganham o e-mail; os demais eventos do sino continuam só no sino.
- **Correção de bug próprio, pré-Fase 7**: ao construir isso, percebi que
  o fallback de `reviewChangeRequest` (Fase 6) disparava
  `reserva_confirmada` ao aprovar um pedido de "nova_reserva" — mas nesse
  momento nenhuma `Reservation` de fato existe ainda (aprovar o pedido não
  cria a reserva automaticamente, por decisão da própria Fase 6), então o
  e-mail sairia com `{{codigo_reserva}}` vazio. Corrigido para cair no
  fallback genérico (`solicitacao_atualizada`) nesse caso — `reserva_confirmada`
  fica reservado para quando a reserva de fato existir (ver item 30).
- **Suite de integridade**: `tests/communication/render-template.test.ts`
  (3 testes, puro) cobre a substituição de `{{variavel}}`.
  `tests/communication/outbox.test.ts` (4 testes, Postgres real) cobre
  exigência de template ativo, idempotência, falha com erro claro sem
  `RESEND_API_KEY`, e o limite de tentativas.
  `tests/documents/render-smoke.test.ts` (6 testes) gera de verdade os 5
  documentos + a plaquinha em PDF contra dados reais de seed e confirma
  que o buffer resultante é um PDF válido — não valida o layout visual
  (isso é revisão humana; amostras enviadas na revisão desta fase).

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

## Pendências / decisões que precisam de confirmação

A especificação instrui a nunca inventar campo ou regra de negócio sem
perguntar. As decisões abaixo foram tomadas para que o sistema fosse
utilizável em cada fase, mas ficam marcadas com `// INFERIDO:` no
`schema.prisma` (ou explicadas no código, quando é lógica e não schema) e
devem ser revisadas:

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
2. **Status de `Reservation`** (`ReservationStatus`): a especificação diz
   que o status é "calculado automaticamente a partir dos serviços
   vinculados", mas não lista os valores possíveis nem o algoritmo.
   Resolvido e **confirmado pelo cliente** na revisão da Fase 3 — enum
   final: `rascunho`, `pendente`, `confirmado`, `em_andamento`,
   `concluido`, `cancelado`, `rejeitado`. Algoritmo em
   `src/lib/reservations/status-pure.ts::computeReservationStatus`, 10
   cenários testados (`tests/reservations/status.test.ts`). Ordem de
   precedência: sem serviços → rascunho; todos cancelados → cancelado;
   todos os não-cancelados concluídos → concluido; algum já
   iniciado/concluído sem que todos estejam concluídos → em_andamento;
   algum aguardando aceite do fornecedor ou recusado → pendente; caso
   contrário → confirmado. `rejeitado` não é alcançado por este algoritmo —
   fica reservado para uma ação manual de rejeitar a reserva inteira, que
   ainda não foi construída. Cancelamento parcial vira o campo
   independente `has_partial_cancellation` (true sempre que há pelo menos
   um serviço cancelado e pelo menos um não cancelado na mesma reserva),
   em vez de um oitavo valor de enum.
3. **Campos operacionais mínimos em `Service`** (data/hora agendada,
   local de origem/destino, número de passageiros, número de voo): não
   estão itemizados na especificação (que foca em preço/desconto/bagagem/
   cadeirinha/aceite), mas são estruturalmente necessários para um
   transfer/passeio/disposição existir. Já em uso no formulário de serviço
   da Fase 3 (`/admin/reservas/[id]/servicos`).
4. **Fórmula de imposto/NF** (`tax_amount`/`tax_percent_snapshot`/
   `nf_value`): a especificação define os campos mas não a fórmula exata
   nem o momento em que o percentual é fixado. Adotado e **corrigido pelo
   cliente** na revisão da Fase 3 (a primeira versão seedava 6% de
   fábrica — removido): não existe alíquota "de fábrica" em lugar nenhum.
   `src/lib/reservations/tax.ts` só calcula quando existe uma alíquota
   definida manualmente por alguém — pelo padrão global
   (`/admin/configuracoes/impostos`, sem seed, vazio até o admin
   preencher) ou diretamente na reserva (campo editável no formulário,
   sobrepõe o padrão). Sem nenhuma das duas, `tax_percent_snapshot` /
   `tax_amount` / `nf_value` ficam `null`. A primeira vez que uma alíquota
   é usada, fica congelada em `tax_percent_snapshot` — mudar o padrão
   global depois não afeta reservas já calculadas, só novas; editar o
   campo da própria reserva sempre tem efeito imediato (é ação manual
   direta, não passa pela lógica de congelamento). A base de cálculo é a
   soma do `price` (já líquido de desconto) dos serviços não cancelados;
   `nf_value` é essa base, `tax_amount` é a alíquota sobre ela.
5. **Contraparte de `FinanceEntry`** (`party_type` / `party_id`): a
   especificação não lista explicitamente de quem é a favor/contra um
   lançamento — só descreve tipo/categoria/status/origem. Sem esse campo o
   razão não seria navegável, então foi adicionado.
6. **`temp_password` do `User`**: a especificação menciona um campo
   `temp_password`, mas armazenar senha em texto plano no banco é uma
   vulnerabilidade (OWASP). A senha temporária é gerada e devolvida uma
   única vez por `generateTemporaryPassword()`
   (`src/lib/auth/provision-user.ts`) para quem criou o cadastro comunicar
   ao usuário — só o Supabase Auth guarda a senha (com hash), e `users`
   guarda apenas o booleano `must_change_password`.
7. **Catálogo de ações do `AuditLog`**: a especificação fala em "mais de
   50 tipos de ação catalogados" mas só dá ~20 exemplos. Em vez de inventar
   os ~30 restantes, `action` ficou como `String` livre (não um enum
   fechado) até o catálogo completo ser definido.
8. **Segurança conhecida das dependências**: `npm audit` aponta 2
   vulnerabilidades em ferramentas de build/dev (PostCSS embutido no
   Next.js 15.x, `deepmerge-ts` embutido no `@prisma/config`) — ambas só
   afetam o processo de build/CLI, não código servido em produção, e a
   correção automática (`npm audit fix --force`) exigiria sair das versões
   fixadas pela stack obrigatória (Next.js 15 e Prisma 6). Deixadas como
   estão, documentadas aqui.
9. **Uso de `"server-only"`**: removido de `src/lib/reservations/status.ts`
   e `tax.ts` (que orquestram Prisma). O pacote `server-only` lança erro
   incondicionalmente fora do runtime de Server Component do Next.js — não
   faz checagem de `typeof window` — o que bloquearia completamente testar
   essas funções via Vitest (que roda em Node puro, não no runtime do
   Next.js). Como esses dois arquivos só fazem orquestração de Prisma
   (que já não funciona em bundle de cliente por outros motivos), manter
   a guarda não agregava proteção real e custava testabilidade. Os módulos
   realmente sensíveis (`admin.ts` com a service role key,
   `provision-user.ts`, `get-current-user.ts`) continuam guardados.
10. **Repasse automático ao motorista próprio — `diaria`/`salario_mensal`**
    (Fase 4): a primeira versão não gerava nenhum lançamento automático
    para esses dois tipos, por não haver na spec uma fórmula de rateio
    entre múltiplos serviços do mesmo dia/mês. **Resolvido e definido pelo
    cliente** na revisão da Fase 4: `diaria` gera um `FinanceEntry`
    (`repasse_motorista`, despesa) por motorista por DIA (dedupe por
    `driver_id` + data, `auto_key = driver_daily:<driverId>:<AAAA-MM-DD>`),
    valor = `Driver.daily_rate`, disparado na conclusão do primeiro serviço
    daquele motorista naquele dia — outros serviços do mesmo motorista
    concluídos no mesmo dia não duplicam. `salario_mensal` segue a mesma
    lógica por MÊS (`auto_key = driver_monthly:<driverId>:<AAAA-MM>`,
    valor = `Driver.salario_mensal`). `mesclado` = as duas coisas em
    paralelo: mantém o repasse por comissão já existente POR SERVIÇO
    (`computeOwnDriverCommissionPay`) e soma o repasse por dia da regra da
    diária, como dois lançamentos distintos
    (`src/lib/finance/settlement.ts::generateOwnDriverPeriodEntries`,
    testado em `tests/finance/lifecycle.test.ts`).
11. **Cobrança direta pelo motorista próprio, sem modo de acerto dedicado**:
    a spec descreve `direct_collection_settlement_mode`
    (`retain_supplier_cost`/`gross_repass`) só para fornecedores. Para
    motorista próprio em cobrança direta não existe custo de fornecedor a
    reter (o motorista é frota interna, sem `supplier_cost`) — então o
    único lançamento gerado é `repasse_motorista` (receita) pelo valor
    cheio menos a comissão configurada, por analogia ao caso
    "retém custo" (não existe um segundo lançamento de "pagamento" porque
    não há nada que a Nativos deva pagar de volta).
12. **`is_net_fare` bloqueia os dois tipos de comissão de reserva**: a spec
    não deixa explícito se tarifa NET afeta `comissao_indicacao` além de
    `comissao_parceiro`. Tratado como bloqueio para as duas, já que "tarifa
    líquida" descreve o valor que a Nativos recebe sem margem para
    comissionar ninguém sobre ele.
13. **Cortesia + cobrança direta + fornecedor retendo custo**: a primeira
    versão não gerava nenhum lançamento neste cenário (nada foi cobrado do
    passageiro, o fornecedor absorve o próprio custo). **Corrigido a pedido
    do cliente** na revisão da Fase 4: agora gera um `FinanceEntry` de
    rastreio/relatório — categoria nova `FinanceEntryCategory.cortesia`,
    `amount = 0`, já nasce com `status = pago` (nunca vira `Payment`, não
    há nada a cobrar) — vinculado ao serviço via `origin_type`/`origin_id`
    e nunca reescrito por uma regeneração posterior (mesma regra de "uma
    vez fechado, só reversão formal muda"). Ver
    `src/lib/finance/settlement.ts::computeServiceSettlementEntries` e
    `tests/finance/lifecycle.test.ts`.
14. **Fora do escopo da Fase 4** (deixado explicitamente para depois, sem
    inventar automação sem uma regra clara na spec): `FinanceEntry`
    automático para `hora_extra`/`km_extra`/`imposto`; uma ferramenta geral
    de compensação de razão (só o par determinístico repasse×pagamento do
    "repassa bruto" é automático); UI de `DirectCollection`
    (registro de "o motorista recebeu direto e confirmou/não confirmou");
    `BillingCycle`/fechamento de fatura por parceiro; `ClientCredit`. Os
    modelos já existem no schema desde a Fase 1; a lógica de negócio sobre
    eles ainda não foi construída.
15. **Correção incidental descoberta durante a Fase 4**: `startService` e
    `completeService` (`src/lib/services/service-execution.ts`, construídos
    na Fase 2/requisito 6) nunca chamavam `recalculateReservationStatus` —
    uma reserva concluída inteiramente pelo portal do motorista/fornecedor
    (sem nenhuma edição pelo admin) nunca teria seu status automático
    recalculado. Corrigido como parte da fiação do motor financeiro (o
    motor depende do status ficar correto para saber quando liberar
    comissões), mas é uma correção de um bug de uma fase já aprovada, não
    uma decisão de design nova — sinalizando aqui para visibilidade.
16. **Escopo Fase 5 vs. Fase 6** (combinado com o cliente antes de
    começar): a Fase 1 descreve o portal do parceiro como quem "solicita/
    altera/cancela reservas" e o do fornecedor como quem "solicita
    repasse" — ações que, no modelo, viram um `ChangeRequest`. Como o
    plano de fases separa "Portais externos" (5) de "Fluxo de aprovação +
    alertas" (6, onde `ChangeRequest` vive com SLA/status/aprovação),
    ficou definido que a Fase 5 constrói só visualização + ações diretas
    que já tinham caminho pronto no modelo (aceite/execução de serviço,
    despesa, recebimento direto, cadastro de motorista/veículo) — nenhum
    `ChangeRequest` é criado ainda. "Solicitar nova reserva/alteração/
    cancelamento/repasse" fica inteiramente para a Fase 6.
17. **Formulário de motorista pelo portal do fornecedor não tem
    `payment_type`/comissão/diária/salário**: só nasce `terceirizado`,
    vinculado à empresa logada — a relação financeira desse motorista é
    com a empresa, não com ele (spec seção 6), então esses campos não se
    aplicam. Exceção: o caso "dono-motorista" (`is_company_owner_driver`)
    tem, sim, remuneração própria por analogia — o formulário do portal
    também não os expõe (ficam com um valor de fábrica inerte,
    `payment_type: diaria`, sem `daily_rate`), porque são termos que a
    spec deixa como decisão do admin, nunca do próprio fornecedor. O admin
    ajusta isso ao revisar/aprovar o cadastro (mesma tela de edição da
    Fase 2, que já tem esses campos).
18. **Granularidade da confirmação de recebimento direto por fornecedor**:
    a spec separa `receiver_type` (quem recebeu fisicamente: inclui
    `motorista_terceirizado`) de `financial_responsible_type` (quem
    responde perante a Nativos), mas o motor de liquidação da Fase 4 nunca
    rastreia repasse por motorista terceirizado individualmente — só por
    fornecedor como um todo. Por isso, quando `collection_actor=fornecedor`,
    o `DirectCollection` usa `receiver_type=fornecedor` (não
    `motorista_terceirizado`) e é confirmado pelo portal da empresa, não do
    motorista — mantendo a granularidade que o razão já usa. Ver
    `src/lib/finance/direct-collection.ts`.
19. **"Não recebido" não reverte o `FinanceEntry` automaticamente**: quando
    o motorista/fornecedor confirma que não recebeu o valor do passageiro,
    isso fica registrado no `DirectCollection` (com o motivo catalogado),
    mas o `FinanceEntry` de repasse correspondente não é revertido nem
    cancelado por conta disso. Decidir se isso vira uma reversão formal,
    um ajuste, ou uma cortesia é um julgamento financeiro do admin — as
    primitivas para isso já existem desde a Fase 4
    (`reverseFinanceEntry`/`cancelUnpaidFinanceEntry`), mas acioná-las
    automaticamente a partir de "não recebido" arriscaria uma decisão
    financeira errada sem revisão humana.
20. **Sino de notificação cobre só 4 dos 11 tipos do enum**: os que têm um
    gatilho concreto e já construído nesta fase (`novo_servico`,
    `servico_atribuido`, `despesa_rejeitada`, `repasse_confirmado`). Os
    demais (`reserva_confirmada`, `alteracao_aprovada`,
    `cancelamento_aprovado`, `pagamento_confirmado`, `comprovante_aprovado`,
    `solicitacao_atualizada`) dependem de fluxos que só existem a partir da
    Fase 6 (`ChangeRequest`) ou da Fase 7 (documentos/faturamento) — não
    foram forçados a disparar de algum jeito aproximado só para "usar o
    enum inteiro".

21. **`ChangeRequest.allocation_details` reaproveitado como campo de
    descrição livre**: o schema não tem um campo de "mensagem"/"motivo"
    para a solicitação — só `allocation_details` (Json), descrito na spec
    como "para repasses multi-pendência". Na falta de outro lugar para o
    requerente explicar o pedido, esse campo virou o destino de qualquer
    detalhe livre (descrição, motivo, ids de lançamento referenciados),
    não só repasse — documentado em `src/lib/change-requests/submit.ts`.
22. **`ChangeRequest`/`ChangeRequestCategory` por tipo**: a spec só diz
    "operacional = 30min; financeiro = 2h", sem listar qual categoria cada
    um dos 12 tipos tem. Adotado: tudo que envolve dinheiro (repasse,
    pagamento de fatura, contestação de valor, antecipação de fatura) é
    financeiro; o resto (reserva, alteração, cancelamento, cadastro,
    correção) é operacional — ver `src/lib/change-requests/sla.ts`.
23. **Aprovar um `ChangeRequest` não aciona nenhuma automação**: aprovar
    uma alteração/cancelamento/repasse só muda o status do protocolo e
    notifica o requerente — não edita a reserva, não cancela o serviço,
    não registra pagamento. Automatizar isso arriscaria aplicar a mudança
    errada sem revisão humana (qual serviço cancelar? qual lançamento
    pagar, já que `allocation_details` pode listar vários?). O admin
    continua fazendo a mudança de fato nas telas já existentes e só então
    marca o protocolo como concluído.
24. **`Alert` reabre em vez de colidir com a constraint de `dedupe_key`**:
    um alerta arquivado manualmente cuja condição volta a acontecer (ex.:
    o mesmo parceiro passa do limite de novo, meses depois) reabre
    (`archived: false`) em vez de tentar criar um segundo registro com o
    mesmo `dedupe_key` (que violaria a constraint UNIQUE). A spec não
    define esse comportamento explicitamente; é a leitura mais coerente
    com "idempotente" + "UNIQUE" coexistindo com uma condição que pode se
    repetir depois de resolvida.
25. **Só 5 dos 17 tipos de `Alert` têm detecção automática**: os
    listados na Fase 6 acima. Os outros 12
    (`overbooking`, `reserva_sem_recursos`, `parceiro_proximo_limite`,
    `fatura_vencida`, `conta_vencida`, `financeiro_inconsistente`,
    `servico_atrasado`, `servico_nao_iniciado`, `sem_motorista`,
    `sem_veiculo`, `bagagem_incompativel`, `passageiros_acima_capacidade`)
    ficaram de fora por dois motivos, nunca por preguiça de implementar:
    (a) exigiriam inventar um limite/threshold que a spec não define
    (ex.: quantos % antes do limite conta como "próximo"; quantos
    passageiros a mais é "acima da capacidade" já que o schema não liga
    bagagem/capacidade a uma validação); ou (b) exigem notar que "o tempo
    passou" (atraso, vencimento) sem nenhum evento de aplicação disparando
    — isso precisa de um job agendado/outbox, que só chega na Fase 7. Nenhum
    threshold foi chutado só para preencher o catálogo inteiro.
26. **Reviewer de exemplo no seed**: `seedApprovalWorkflowExamples` cria um
    `User` interno fixo (`seed-revisor@nativos-interno.seed`) só para
    servir de `reviewed_by_id` nos 2 `ChangeRequest` de exemplo — ele não
    tem um `auth_user_id` real do Supabase (é um UUID qualquer), então não
    é um login funcional, só um dado de referência para o seed não
    depender de um projeto Supabase configurado.
27. **Escopo de documentos combinado com o cliente antes de começar**
    (Fase 7): voucher, ordem de serviço, recibo, contrato e orçamento —
    os 5 que já tinham todo o dado necessário modelado hoje. Fatura
    parcial/mensal fechada (dependem do `BillingCycle`, nunca construído)
    e "relatório" (sobreposto ao painel da Fase 8) ficaram de fora
    deliberadamente, não por limitação técnica.
28. **Recibo/contrato/orçamento só para a equipe interna**: voucher e OS já
    têm um destinatário natural fora da equipe (o parceiro que originou a
    reserva; o motorista/fornecedor do serviço), então o portal pode
    baixá-los. Os outros 3 ficam só com `requireInternalUser()` — são
    documentos tipicamente enviados por e-mail pelo admin depois de
    revisar, não desenhados para o próprio portal solicitar/baixar; nada
    impede estender isso depois, mas não foi construído sem um pedido
    explícito.
29. **Nenhum documento fica salvo em Storage**: todos os 6 (5 documentos +
    plaquinha) são gerados sob demanda e devolvidos direto na resposta
    (`renderToBuffer`), nunca persistidos. A spec menciona "Supabase
    Storage (comprovantes/contratos)" — interpretado como armazenamento
    de comprovante/anexo que o USUÁRIO sobe (`Payment.receipt_url`,
    `ServiceExpense.receipt_url`, ainda um link colado à mão desde a Fase
    5), não como um arquivo de saída que o sistema gera; regenerar o PDF é
    sempre idêntico ao original (mesmos dados, mesmo layout), então
    guardar uma cópia não traria uma garantia adicional que valesse a
    complexidade de configurar um bucket agora.
30. **Contrato: todas as cláusulas ativas, sem seleção por reserva**: a
    spec não define qual cláusula entra em qual contrato — só que
    `ContractClause` é reutilizável por categoria/ordem. Adotado: o
    documento inclui todas as cláusulas ativas, agrupadas por categoria
    (geral primeiro, depois financeiro/cancelamento, o resto em ordem
    alfabética) e ordenadas por `order` — nenhuma tela de "escolher
    cláusulas desta reserva" foi construída.
31. **E-mail automático cobre só os 4 eventos que já tinham
    `EmailTemplate` com `auto_send=true`** (convenção do seed desde a Fase
    1/2): `reserva_confirmada`, `alteracao_aprovada`, `cancelamento_aprovado`,
    `pagamento_confirmado`. Note que `pagamento_confirmado` nunca é
    disparado por nenhum código ainda — a Fase 5 usa `repasse_confirmado`
    (sem template) para "Nativos pagou você"; `pagamento_confirmado`
    descreveria o sentido oposto ("Nativos recebeu seu pagamento", ex. de
    um parceiro faturado), que não tem gatilho construído ainda — fica
    pronto para quando o fluxo de fatura existir.

## Próximas fases

Conforme o plano de construção, a Fase 8 (relatórios e dashboard admin) só
deve começar após confirmação de que a Fase 7 está correta. A Fase 7
deixou pronta a geração de 5 documentos (voucher, ordem de serviço,
recibo, contrato, orçamento) mais a plaquinha de recepção, todos na
identidade da marca, e um outbox de e-mail real via Resend (fila com
retry, processado por cron — 1x/dia por enquanto, limite do plano Hobby
da Vercel — ou por botão manual; nunca disparo direto). Duas coisas
ficaram deliberadamente de fora do escopo,
por decisão do cliente: fatura parcial e fatura mensal fechada, que
dependem de um `BillingCycle` que ainda não existe em nenhuma fase (é
decisão de modelo de negócio que merece fase própria — o cliente pediu
para ser avisado quando chegarmos nesse ponto do plano, para decidir onde
ela entra); e "Relatório" como documento avulso, que se sobrepõe ao painel
da própria Fase 8. Vale registrar também que a automação por tempo
(despesa/serviço atrasado, fatura vencida) prevista na Fase 6 continua sem
gatilho: o outbox construído aqui resolve a fila de envio, mas nenhum job
agendado varre o banco procurando exceções de prazo — isso segue em
aberto para quando houver necessidade concreta. `allocation_details` do
`ChangeRequest` também não tem um formulário rígido — fica como JSON
livre até haver um caso de uso que exija mais estrutura.
