/*
  Warnings:

  - The values [CLIENT,AGENT] on the enum `MessageSenderType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MessageSenderType_new" AS ENUM ('CLIENTE', 'INTERNO', 'AI');
ALTER TYPE "MessageSenderType" RENAME TO "MessageSenderType_old";
ALTER TYPE "MessageSenderType_new" RENAME TO "MessageSenderType";
DROP TYPE "public"."MessageSenderType_old";
COMMIT;
