import { Prisma } from '@prisma/client';

/** Preserva solicitações do site ao remover seus cadastros vinculados. */
export async function desvincularSolicitacoesSite(
  tx: Prisma.TransactionClient,
  vinculos: { leadId?: string | null; clientId?: string | null },
) {
  // Algumas bases antigas possuem vínculos que não fazem parte do schema atual.
  // Consulta as colunas antes de usá-las para atender também às bases sem esses vínculos.
  const colunas = await tx.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'SolicitacaoSite'
      AND column_name IN ('leadId', 'clientId')
  `;
  if (
    vinculos.leadId &&
    colunas.some((coluna) => coluna.column_name === 'leadId')
  ) {
    await tx.$executeRaw`UPDATE "SolicitacaoSite" SET "leadId" = NULL WHERE "leadId" = ${vinculos.leadId}`;
  }
  if (
    vinculos.clientId &&
    colunas.some((coluna) => coluna.column_name === 'clientId')
  ) {
    await tx.$executeRaw`UPDATE "SolicitacaoSite" SET "clientId" = NULL WHERE "clientId" = ${vinculos.clientId}`;
  }
}
