import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export function cadastroMcg(): Prisma.ClientWhereInput {
  return {
    leadCadastro: { metadata: { path: ['responsible'], equals: 'MCG' } },
  };
}

export function responsavelMcg(
  metadata: Prisma.JsonValue | undefined,
): boolean {
  return (
    !!metadata &&
    typeof metadata === 'object' &&
    !Array.isArray(metadata) &&
    metadata.responsible === 'MCG'
  );
}

export function idOportunidade(
  metadata: Prisma.JsonValue | undefined,
): string | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
    return;
  return typeof metadata.opportunityId === 'string'
    ? metadata.opportunityId
    : undefined;
}

export function documentoVisivelConsultora(
  documento: { category: string | null; uploadedById: string | null },
  userId: string,
) {
  return (
    documento.category !== 'OPORTUNIDADE_PROPOSTA' ||
    documento.uploadedById === userId
  );
}

// O evento de criação é gravado na mesma transação da oportunidade.
// Não inferir autoria a partir do responsável do cadastro compartilhado.
export async function oportunidadesDaConsultora(
  prisma: PrismaService,
  userId: string,
  clientId?: string,
) {
  const eventos = await prisma.timelineEvent.findMany({
    where: {
      createdById: userId,
      type: 'OPPORTUNITY_CREATED',
      ...(clientId ? { clientId } : {}),
    },
    select: { metadata: true },
  });
  return [
    ...new Set(
      eventos
        .map((evento) => idOportunidade(evento.metadata))
        .filter((id): id is string => !!id),
    ),
  ];
}
