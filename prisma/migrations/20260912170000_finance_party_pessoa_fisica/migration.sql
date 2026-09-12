-- Fase 4 (motor financeiro): um indicador de reserva pode ser uma pessoa
-- física avulsa (referrer_type = pessoa_fisica, sem cadastro próprio no
-- sistema). FinancePartyType não tinha um valor para isso — sem ele, a
-- comissão de indicação para esse caso não teria como ser registrada no
-- razão. party_id fica null; o nome/documento já vivem em
-- Reservation.referrer_name/referrer_document.
ALTER TYPE "FinancePartyType" ADD VALUE 'pessoa_fisica';
