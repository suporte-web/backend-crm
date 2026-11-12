import { OportunidadesService } from './oportunidades.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '@prisma/client';

describe('Oportunidades MCG por autoria', () => {
  const consultora = {
    sub: 'consultora',
    email: 'c@test.local',
    role: UserRole.CONSULTORA,
  };
  function setup(responsible = 'MCG', author = 'consultora') {
    const client = {
      id: 'c1',
      modalidadeCadastro: 'LEAD',
      internalOwnerId: 'comercial',
      leadCadastro: { metadata: { responsible } },
    };
    const db = {
      roleScreenPermission: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { role: 'CONSULTORA', screenKey: 'opportunities', isEnabled: true },
          ]),
      },
      client: {
        findUnique: jest.fn().mockResolvedValue(client),
        findFirst: jest
          .fn()
          .mockResolvedValue(responsible === 'MCG' ? client : null),
        findMany: jest.fn().mockResolvedValue([client]),
      },
      opportunity: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'o1', clientId: 'c1', client }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      timelineEvent: {
        findMany: jest.fn(async ({ where }: any) =>
          where.createdById === author
            ? [{ metadata: { opportunityId: 'o1' } }]
            : [],
        ),
        findFirst: jest.fn(async ({ where }: any) =>
          where.createdById === author ? { id: 'event' } : null,
        ),
      },
      $transaction: jest.fn().mockResolvedValue({}),
    };
    const audit = { create: jest.fn() };
    return {
      db,
      service: new OportunidadesService(
        db as unknown as PrismaService,
        audit as unknown as AuditLogsService,
        {
          getUserIdsByRoles: jest.fn().mockResolvedValue(['comercial']),
          notifyUsers: jest.fn().mockResolvedValue(undefined),
        } as unknown as NotificationsService,
      ),
    };
  }
  it('permite abrir cadastro MCG do Comercial para criar oportunidade', async () => {
    const { service } = setup();
    await expect(
      service.validarDetalhe(consultora, 'c1'),
    ).resolves.toBeUndefined();
  });
  it('filtra por autoria da sessão e cadastro MCG, inclusive quando há filtro de cadastro', async () => {
    const { db, service } = setup();
    await service.listar(consultora, { clienteId: 'c1' });
    expect(db.timelineEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdById: 'consultora',
          type: 'OPPORTUNITY_CREATED',
        }),
      }),
    );
    expect(db.opportunity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['o1'] },
          clientId: 'c1',
          client: expect.objectContaining({
            leadCadastro: {
              metadata: { path: ['responsible'], equals: 'MCG' },
            },
          }),
        }),
      }),
    );
  });
  it('bloqueia por ID a oportunidade do Comercial no mesmo cadastro MCG', async () => {
    const { db, service } = setup('MCG', 'comercial');
    await expect(service.excluir(consultora, 'o1')).rejects.toThrow(
      'permissão',
    );
    expect(db.$transaction).not.toHaveBeenCalled();
    await expect(
      service.atualizar(consultora, 'o1', { titulo: 'Alterado' }),
    ).rejects.toThrow('permissão');
    await expect(
      service.atualizarEtapa(consultora, 'o1', { etapa: 'CONTATO' as never }),
    ).rejects.toThrow('permissão');
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('mantém autoria da sessão ao criar uma oportunidade em cadastro MCG do Comercial', async () => {
    const { db, service } = setup();
    const tx = {
      opportunity: { create: jest.fn().mockResolvedValue({ id: 'nova' }) },
      timelineEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    db.$transaction.mockImplementation(async (fn) => fn(tx));
    await expect(
      service.criar(consultora, { clienteId: 'c1', titulo: 'Minha proposta' }),
    ).resolves.toMatchObject({ id: 'nova' });
    expect(tx.timelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'OPPORTUNITY_CREATED',
          createdById: consultora.sub,
          metadata: expect.objectContaining({ opportunityId: 'nova' }),
        }),
      }),
    );
  });
  it('mantém escopo da consultora mesmo quando ela também tem perfil Comercial', async () => {
    const { db, service } = setup();
    await service.listar(
      { ...consultora, roles: [UserRole.CONSULTORA, UserRole.COMERCIAL] },
      {},
    );
    expect(db.opportunity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['o1'] } }),
      }),
    );
  });
  it('bloqueia oportunidade própria quando cadastro não é MCG', async () => {
    const { service } = setup('OUTRO');
    await expect(service.validarDetalhe(consultora, 'c1')).rejects.toThrow(
      'permissão',
    );
  });
  it('mantém listagem do Comercial sem restrição de autoria nem responsável MCG', async () => {
    const { db, service } = setup();
    await service.listar({ ...consultora, role: UserRole.COMERCIAL }, {});
    expect(db.timelineEvent.findMany).not.toHaveBeenCalled();
    expect(db.opportunity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { client: { modalidadeCadastro: { in: ['CLIENTE', 'LEAD'] } } },
      }),
    );
  });
});
