-- O Nativos ERP passa a trabalhar com envio de e-mail exclusivamente manual.
-- Mantemos a coluna para compatibilidade histórica, mas nenhum template pode
-- continuar disparando automaticamente por evento.
UPDATE "email_templates" SET "auto_send" = false WHERE "auto_send" = true;

-- Cobranças não são encaminhadas por e-mail ao passageiro. O modelo antigo
-- fica preservado apenas para histórico e deixa de aparecer para novos envios.
UPDATE "email_templates" SET "active" = false WHERE "key" = 'cobranca_cliente';
