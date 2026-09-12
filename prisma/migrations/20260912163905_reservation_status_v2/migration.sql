-- Renomeia o enum ReservationStatus para os nomes aprovados pelo cliente
-- (rascunho, pendente, confirmado, em_andamento, concluido, cancelado,
-- rejeitado) e introduz has_partial_cancellation como sinal independente
-- de cancelamento parcial, em vez do antigo status "parcialmente_cancelada"
-- fora da lista aprovada.
--
-- Mapeamento de dados existentes:
--   aguardando_confirmacao -> pendente
--   confirmada             -> confirmado
--   em_andamento           -> em_andamento (sem mudança)
--   concluida              -> concluido
--   cancelada              -> cancelado
--   parcialmente_cancelada -> concluido, com has_partial_cancellation = true
--
-- "rejeitado" não é usado por nenhuma linha existente (o algoritmo
-- automático nunca produzia esse status antes, e continua não produzindo
-- — fica reservado para uma ação manual futura).
--
-- Postgres não permite remover um valor de enum diretamente, então o tipo
-- é recriado do zero com a lista final de valores.

CREATE TYPE "ReservationStatus_new" AS ENUM ('rascunho', 'pendente', 'confirmado', 'em_andamento', 'concluido', 'cancelado', 'rejeitado');

ALTER TABLE "reservations" ADD COLUMN "status_new" "ReservationStatus_new";

ALTER TABLE "reservations" ADD COLUMN "has_partial_cancellation" BOOLEAN NOT NULL DEFAULT false;

UPDATE "reservations" SET
  "status_new" = CASE "status"::text
    WHEN 'aguardando_confirmacao' THEN 'pendente'
    WHEN 'confirmada' THEN 'confirmado'
    WHEN 'em_andamento' THEN 'em_andamento'
    WHEN 'concluida' THEN 'concluido'
    WHEN 'cancelada' THEN 'cancelado'
    WHEN 'parcialmente_cancelada' THEN 'concluido'
    ELSE 'pendente'
  END::"ReservationStatus_new",
  "has_partial_cancellation" = ("status"::text = 'parcialmente_cancelada');

ALTER TABLE "reservations" DROP COLUMN "status";
ALTER TABLE "reservations" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "reservations" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "reservations" ALTER COLUMN "status" SET DEFAULT 'rascunho';

DROP TYPE "ReservationStatus";
ALTER TYPE "ReservationStatus_new" RENAME TO "ReservationStatus";
