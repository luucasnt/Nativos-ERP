-- CreateEnum
CREATE TYPE "CollectionActor" AS ENUM ('nativos', 'motorista_proprio', 'fornecedor');

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "collection_actor" "CollectionActor" NOT NULL DEFAULT 'nativos';

-- Backfill: recalcula collection_actor para linhas existentes a partir de
-- collection_mode (na reserva) + execution_type (no serviço), em vez de
-- deixar tudo no valor padrão 'nativos'.
UPDATE "services" s
SET "collection_actor" = CASE
  WHEN r."collection_mode" != 'direto' THEN 'nativos'
  WHEN s."execution_type" = 'propria' THEN 'motorista_proprio'
  ELSE 'fornecedor'
END::"CollectionActor"
FROM "reservations" r
WHERE r."id" = s."reservation_id";
