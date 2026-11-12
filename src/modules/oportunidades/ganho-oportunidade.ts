import { NotFoundException } from '@nestjs/common';
import { Prisma, TimelineEventType } from '@prisma/client';
import { historicoPerda, resolverPerda } from './motivos-perda';

/** Aprovações existentes de propostas/chamados usam a mesma limpeza de perdas. */
export async function registrarGanhoOportunidade(
  tx: Prisma.TransactionClient,
  oportunidadeId: string,
  autorId: string,
  valor: Prisma.Decimal,
) {
  const anterior = await tx.opportunity.findUnique({
    where: { id: oportunidadeId },
  });
  if (!anterior) throw new NotFoundException('Oportunidade não encontrada.');
  const perda = resolverPerda('WON', {});
  const atualizada = await tx.opportunity.update({
    where: { id: oportunidadeId },
    data: { value: valor, stage: 'GANHO', status: 'WON', ...perda },
  });
  if (
    anterior.status === 'LOST' ||
    anterior.lostReason ||
    anterior.motivoPerda ||
    anterior.observacaoPerda
  ) {
    await tx.timelineEvent.create({
      data: {
        clientId: anterior.clientId,
        createdById: autorId,
        type: TimelineEventType.OPPORTUNITY_WON,
        title: 'Oportunidade ganha',
        description:
          'A oportunidade "' +
          anterior.title +
          '" foi marcada como ganha pela aprovação comercial. O registro anterior da perda foi preservado no histórico.',
        metadata: {
          opportunityId: oportunidadeId,
          from: anterior.stage,
          to: 'GANHO',
          ...historicoPerda(anterior, perda),
        },
      },
    });
  }
  return atualizada;
}
