-- Reconcilia a estrutura atual de Client
-- com o histórico oficial de migrations.

-- O campo internalOwnerId continua existindo,
-- mas não possui mais relacionamento FK com User.
ALTER TABLE "Client"
DROP CONSTRAINT IF EXISTS "Client_internalOwnerId_fkey";


-- Cliente pode ou não possuir usuário de login.
ALTER TABLE "Client"
ADD COLUMN IF NOT EXISTS "userId" TEXT;


-- userId é único quando preenchido.
CREATE UNIQUE INDEX IF NOT EXISTS "Client_userId_key"
ON "Client"("userId");


-- Cria a FK apenas se ela ainda não existir.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Client_userId_fkey'
    ) THEN
        ALTER TABLE "Client"
        ADD CONSTRAINT "Client_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END
$$;