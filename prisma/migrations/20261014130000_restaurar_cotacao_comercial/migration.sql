-- Restaurar o encaminhamento de cotações ao Comercial, mantendo responsáveis e conversões.
BEGIN;
UPDATE "SolicitacaoSite"
SET departamento = 'COMERCIAL'
WHERE tipo = 'COTACAO' AND (departamento IS NULL OR departamento = 'MARKETING');

-- Apenas Leads ainda na triagem do site retornam à entrada do funil.
UPDATE "Lead" l
SET status = 'entrada_leads'
WHERE l.source = 'site' AND l.status = 'site_lead'
  AND l."convertidoParaCliente" = false
  AND EXISTS (
    SELECT 1 FROM "SolicitacaoSite" s
    WHERE s.tipo = 'COTACAO' AND s.id = l.metadata->>'solicitacaoSiteId'
  );
COMMIT;
