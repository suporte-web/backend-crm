import { Prisma } from '@prisma/client';
import { registrarGanhoOportunidade } from './ganho-oportunidade';

describe('Ganho por aprovação de proposta ou chamado', () => {
  it('remove perda atual e mantém texto legado, categoria, observação e autoria no histórico', async () => {
    const anterior = {
      id: 'o1',
      clientId: 'c1',
      title: 'Proposta',
      status: 'LOST',
      stage: 'PERDIDO',
      lostReason: 'Motivo livre legado',
      motivoPerda: 'OUTRO',
      observacaoPerda: 'Sem capacidade',
    };
    const tx = {
      opportunity: {
        findUnique: async () => anterior,
        update: jest.fn(async (args: unknown) => args),
      },
      timelineEvent: { create: jest.fn(async (args: unknown) => args) },
    };
    await registrarGanhoOportunidade(
      tx as unknown as Prisma.TransactionClient,
      'o1',
      'gestora',
      new Prisma.Decimal(100),
    );
    expect(tx.opportunity.update.mock.calls[0][0]).toMatchObject({
      data: {
        stage: 'GANHO',
        status: 'WON',
        lostReason: null,
        motivoPerda: null,
        observacaoPerda: null,
      },
    });
    expect(tx.timelineEvent.create.mock.calls[0][0]).toMatchObject({
      data: {
        createdById: 'gestora',
        metadata: {
          textoPerdaAnterior: 'Motivo livre legado',
          motivoPerdaAnterior: 'OUTRO',
          observacaoPerdaAnterior: 'Sem capacidade',
          motivoPerda: null,
        },
      },
    });
  });
});
