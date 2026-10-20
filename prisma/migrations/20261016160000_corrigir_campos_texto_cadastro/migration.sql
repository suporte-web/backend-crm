-- O formulário e o schema Prisma usam texto nestes campos.
-- Corrige bancos divergentes que ainda possuem JSON, preservando os valores.
-- Em bancos que já usam TEXT, nenhuma alteração é feita.
DO $$
DECLARE
  campo TEXT;
BEGIN
  FOREACH campo IN ARRAY ARRAY['address', 'bankDetails'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'Client'
        AND column_name = campo
        AND data_type IN ('json', 'jsonb')
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I.%I ALTER COLUMN %I TYPE TEXT USING '
        || '(CASE WHEN %I IS NULL OR jsonb_typeof(%I::jsonb) = ''null'' THEN NULL '
        || 'WHEN jsonb_typeof(%I::jsonb) = ''string'' THEN %I::jsonb #>> ''{}'' '
        || 'ELSE %I::text END)',
        current_schema(), 'Client', campo, campo, campo, campo, campo, campo
      );
    END IF;
  END LOOP;
END $$;
