-- Fase 4 (motor financeiro, correção pedida pelo cliente): o cenário
-- "cortesia + cobrança direta + fornecedor retém custo" deixou de gerar
-- zero lançamentos. Agora gera um registro de rastreio com amount=0 nesta
-- categoria nova, para o serviço ficar visível no razão mesmo sem nenhuma
-- receita/despesa real associada.
ALTER TYPE "FinanceEntryCategory" ADD VALUE 'cortesia';
