ALTER TABLE "Quote"
  ALTER COLUMN "desiredDeadline" TYPE TEXT
  USING CASE
    WHEN "desiredDeadline" IS NULL THEN NULL
    ELSE "desiredDeadline"::TEXT
  END;

ALTER TABLE "Proposta"
  ALTER COLUMN "validadeDias" TYPE TEXT
  USING CASE
    WHEN "validadeDias" IS NULL THEN NULL
    ELSE "validadeDias"::TEXT
  END;

ALTER TABLE "ChatParticipant"
  ADD COLUMN "lastReadAt" TIMESTAMP(3);

CREATE INDEX "ChatParticipant_userId_lastReadAt_idx"
  ON "ChatParticipant"("userId", "lastReadAt");
