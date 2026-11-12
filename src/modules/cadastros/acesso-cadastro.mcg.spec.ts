import { ExecutionContext } from '@nestjs/common';
import { AcessoCadastroGuard } from './acesso-cadastro.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('Acesso MCG nas rotas legadas de cadastro', () => {
  function setup(method: string, opportunityId?: string) {
    const db = {
      roleScreenPermission: { findMany: jest.fn().mockResolvedValue([]) },
      client: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 'c1',
            modalidadeCadastro: 'LEAD',
            internalOwnerId: 'comercial',
          }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      lead: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            createdById: 'comercial',
            metadata: { responsible: 'MCG' },
          }),
      },
      opportunity: {
        findUnique: jest.fn().mockResolvedValue({ id: 'o1', clientId: 'c1' }),
      },
      timelineEvent: {
        findFirst: jest.fn().mockResolvedValue({ id: 'evento-proprio' }),
      },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          params: { id: 'c1', opportunityId },
          user: { sub: 'consultora', role: 'CONSULTORA' },
        }),
      }),
    } as unknown as ExecutionContext;
    return {
      guard: new AcessoCadastroGuard(db as unknown as PrismaService),
      context,
      db,
    };
  }
  it('permite GET para cadastro MCG de terceiros', async () => {
    const { guard, context } = setup('GET');
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
  it.each(['PATCH', 'POST', 'DELETE'])(
    'preserva bloqueio de escrita em %s',
    async (method) => {
      const { guard, context } = setup(method);
      await expect(guard.canActivate(context)).rejects.toThrow('outra pessoa');
    },
  );
  it('preserva bloqueio da tela mesmo para leitura MCG', async () => {
    const { guard, context, db } = setup('GET');
    db.roleScreenPermission.findMany.mockResolvedValue([
      { role: 'CONSULTORA', screenKey: 'cadastros', isEnabled: false },
    ]);
    await expect(guard.canActivate(context)).rejects.toThrow('permissão');
  });
  it('bloqueia alteração por rota legada de oportunidade própria fora de MCG', async () => {
    const { guard, context, db } = setup('PATCH', 'o1');
    db.client.findUnique.mockResolvedValue({
      id: 'c1',
      modalidadeCadastro: 'LEAD',
      internalOwnerId: 'consultora',
    });
    db.lead.findUnique.mockResolvedValue({
      createdById: 'consultora',
      metadata: { responsible: 'OUTRO' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow('permissão');
  });
});
