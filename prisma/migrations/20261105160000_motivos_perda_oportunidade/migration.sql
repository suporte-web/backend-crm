-- PREPARADA LOCALMENTE. Não executar antes de reconciliar o histórico de migrations.
-- Campos opcionais: nenhuma classificação ou atualização de registros antigos.
ALTER TABLE "Opportunity"
  ADD COLUMN "motivoPerda" TEXT,
  ADD COLUMN "observacaoPerda" TEXT;
