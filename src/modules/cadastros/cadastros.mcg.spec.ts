import { CadastrosService } from './cadastros.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CadastrosController } from './cadastros.controller';
import { LeadsService } from '../leads/leads.service';

describe('Leitura dos cadastros MCG', () => {
  const user = {
    sub: 'consultora',
    email: 'c@test.local',
    role: UserRole.CONSULTORA,
  };
  function setup(responsible = 'MCG') {
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
        findMany: jest.fn().mockResolvedValue([]),
      },
      lead: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            createdById: 'comercial',
            metadata: { responsible },
          }),
      },
      $transaction: jest.fn(),
    };
    return {
      db,
      service: new CadastrosService(db as unknown as PrismaService),
    };
  }
  it('abre cadastro MCG criado pelo Comercial', async () => {
    const { service } = setup();
    await expect(service.obter(user, 'c1')).resolves.toMatchObject({
      id: 'c1',
    });
  });
  it('inclui MCG no escopo sem substituir a busca nem os vínculos anteriores', async () => {
    const { db, service } = setup();
    await service.listar(user, 'LEAD', 'Empresa');
    expect(db.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { companyName: { contains: 'Empresa', mode: 'insensitive' } },
          ]),
          AND: [
            {
              OR: expect.arrayContaining([
                { internalOwnerId: user.sub },
                {
                  leadCadastro: {
                    metadata: { path: ['responsible'], equals: 'MCG' },
                  },
                },
              ]),
            },
          ],
        }),
      }),
    );
  });
  it('não abre cadastro de terceiros com outro responsável', async () => {
    const { service } = setup('OUTRO');
    await expect(service.obter(user, 'c1')).rejects.toThrow('outra pessoa');
  });
  it('não amplia edição de etapa, foto ou modalidade ao liberar leitura MCG', async () => {
    const { db, service } = setup();
    await expect(
      service.atualizarEtapa(user, 'c1', { etapa: 'cotacao' }),
    ).rejects.toThrow('outra pessoa');
    await expect(service.atualizarFoto(user, 'c1', '')).rejects.toThrow(
      'outra pessoa',
    );
    await expect(
      service.alterarModalidade(user, 'c1', { modalidadeCadastro: 'CLIENTE' }),
    ).rejects.toThrow('outra pessoa');
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('não amplia edição de lead nem inclusão de observação nas rotas de cadastro', async () => {
    const { service } = setup();
    const leads = { update: jest.fn(), criarObservacao: jest.fn() };
    const controller = new CadastrosController(
      service,
      leads as unknown as LeadsService,
    );
    await expect(
      controller.atualizarLead(user, 'c1', { company: 'Alterada' }),
    ).rejects.toThrow('outra pessoa');
    await expect(
      controller.observacao(user, 'c1', { content: 'Nova nota' }),
    ).rejects.toThrow('outra pessoa');
    expect(leads.update).not.toHaveBeenCalled();
    expect(leads.criarObservacao).not.toHaveBeenCalled();
  });
});
