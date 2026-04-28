ALTER TABLE "Ticket" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'ABERTO';

UPDATE "Ticket" SET "status" = 'ABERTO' WHERE "status"::text IN ('NEW', 'NOVO');
UPDATE "Ticket" SET "status" = 'EM_ANDAMENTO' WHERE "status"::text = 'IN_PROGRESS';
UPDATE "Ticket" SET "status" = 'AGUARDANDO_CLIENTE' WHERE "status"::text = 'WAITING_CUSTOMER';
UPDATE "Ticket" SET "status" = 'FECHADO' WHERE "status"::text = 'CLOSED';

ALTER TABLE "TicketMessage" ALTER COLUMN "senderType" SET DEFAULT 'INTERNO';
