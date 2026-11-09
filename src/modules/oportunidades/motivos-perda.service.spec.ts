import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OportunidadesService } from './oportunidades.service';
import { ClientsService } from '../clientes/clients.service';
import { UserRole } from '@prisma/client';

describe('Motivos padronizados nas escritas de oportunidades', () => {
  const user = {
    sub: 'vendedora',
    email: 'v@example.invalid',
    role: UserRole.COMERCIAL,
  };
  const client = {
    id: 'c1',
    modalidadeCadastro: 'CLIENTE',
    internalOwnerId: 'vendedora',
    companyName: 'Empresa',
    user: null,
  };
  function setup() {
    const row = {
      id: 'o1',
      clientId: 'c1',
      title: 'Proposta',
      stage: 'PROPOSTA',
      status: 'OPEN',
      value: null,
      lostReason: null as string | null,
      motivoPerda: null as string | null,
      observacaoPerda: null as string | null,
      client,
    };
    const tx = {
      opportunity: {
        create: jest.fn(async ({ data }: { data: object }) => ({
          ...row,
          ...data,
        })),
        update: jest.fn(async ({ data }: { data: object }) => ({
          ...row,
          ...data,
        })),
      },
      timelineEvent: { create: jest.fn(async (_args: unknown) => ({})) },
    };
    const db = {
      ...tx,
      opportunity: {
        ...tx.opportunity,
        findUnique: jest.fn(async () => row),
        findFirst: jest.fn(async () => row),
      },
      client: { findUnique: jest.fn(async () => client) },
      roleScreenPermission: {
        findMany: jest.fn(async () => [
          { role: 'CONSULTORA', screenKey: 'opportunities', isEnabled: true },
        ]),
        findUnique: jest.fn(async () => null),
      },
      cadastroPermissaoPerfil: {
        findMany: jest.fn(async () => [
          { modalidadeCadastro: 'CLIENTE', permitido: true },
        ]),
      },
      $transaction: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
    };
    const prisma = db as unknown as PrismaService;
    const service = new OportunidadesService(
      prisma,
      { create: async () => ({}) } as unknown as AuditLogsService,
      {} as NotificationsService,
    );
    const clients = Reflect.construct(ClientsService, [
      prisma,
      {},
      {},
      {},
    ]) as ClientsService;
    return { service, clients, tx, row };
  }
  it.each(['ADMIN', 'GESTAO', 'COMERCIAL'] as const)(
    'preserva encerramento autorizado para %s e grava autoria/justificativa',
    async (role) => {
      const { service, tx } = setup();
      const updated = await service.atualizarEtapa({ ...user, role }, 'o1', {
        etapa: 'PERDIDO',
        motivoPerda: 'LIMITACAO_OPERACIONAL',
        observacaoPerda: 'Não temos capacidade de armazenagem.',
      });
      expect(updated).toMatchObject({
        status: 'LOST',
        motivoPerda: 'LIMITACAO_OPERACIONAL',
        observacaoPerda: 'Não temos capacidade de armazenagem.',
      });
      expect(tx.timelineEvent.create.mock.calls[0][0]).toMatchObject({
        data: {
          createdById: user.sub,
          metadata: {
            opportunityId: 'o1',
            motivoPerda: 'LIMITACAO_OPERACIONAL',
          },
        },
      });
    },
  );
  it('a rota de status grava motivo e sincroniza etapa', async () => {
    const { clients, tx } = setup();
    expect(
      await clients.updateOpportunityStatus(user, 'c1', 'o1', 'LOST', {
        motivoPerda: 'CONCORRENTE',
      }),
    ).toMatchObject({
      status: 'LOST',
      stage: 'PERDIDO',
      motivoPerda: 'CONCORRENTE',
    });
    expect(tx.timelineEvent.create.mock.calls[0][0]).toMatchObject({
      data: { createdById: user.sub, type: 'OPPORTUNITY_LOST' },
    });
  });
  it('edição completa também classifica e registra observações', async () => {
    const { service, tx } = setup();
    expect(
      await service.atualizar(user, 'o1', {
        etapa: 'PERDIDO',
        motivoPerda: 'OUTRO',
        observacaoPerda: 'Mudança de estratégia',
      }),
    ).toMatchObject({
      motivoPerda: 'OUTRO',
      observacaoPerda: 'Mudança de estratégia',
    });
    expect(tx.timelineEvent.create.mock.calls[0][0]).toMatchObject({
      data: { metadata: { observacaoPerda: 'Mudança de estratégia' } },
    });
  });
  it('não permite Consultora alterar oportunidade de outro responsável', async () => {
    const { service } = setup();
    await expect(
      service.atualizarEtapa(
        { ...user, sub: 'outra', role: UserRole.CONSULTORA },
        'o1',
        { etapa: 'PERDIDO', motivoPerda: 'CONCORRENTE' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('não permite Marketing encerrar oportunidades diretamente', async () => {
    const { service, clients } = setup();
    await expect(
      service.atualizarEtapa({ ...user, role: UserRole.MARKETING }, 'o1', {
        etapa: 'PERDIDO',
        motivoPerda: 'CONCORRENTE',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      clients.updateOpportunityStatus(
        { ...user, role: UserRole.MARKETING },
        'c1',
        'o1',
        'LOST',
        { motivoPerda: 'CONCORRENTE' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('edição de perda legada com etapa aberta também exige classificação', async () => {
    const { service, row } = setup();
    row.status = 'LOST';
    await expect(
      service.atualizar(user, 'o1', { titulo: 'Título atualizado' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('reabertura pela rota de status limpa classificação atual e preserva histórico', async () => {
    const { clients, row, tx } = setup();
    row.status = 'LOST';
    row.stage = 'PERDIDO';
    row.motivoPerda = 'OUTRO';
    row.observacaoPerda = 'Motivo anterior';
    expect(
      await clients.updateOpportunityStatus(user, 'c1', 'o1', 'OPEN'),
    ).toMatchObject({
      status: 'OPEN',
      stage: 'NEGOCIACAO',
      motivoPerda: null,
      observacaoPerda: null,
    });
    expect(tx.timelineEvent.create.mock.calls[0][0]).toMatchObject({
      data: {
        metadata: {
          motivoPerdaAnterior: 'OUTRO',
          observacaoPerdaAnterior: 'Motivo anterior',
          motivoPerda: null,
        },
      },
    });
  });
  it('Consultora pode classificar oportunidade própria quando sua tela está habilitada', async () => {
    const { service } = setup();
    expect(
      await service.atualizarEtapa(
        { ...user, role: UserRole.CONSULTORA },
        'o1',
        { etapa: 'PERDIDO', motivoPerda: 'CONCORRENTE' },
      ),
    ).toMatchObject({ motivoPerda: 'CONCORRENTE' });
  });
  it('não permite criar uma oportunidade já perdida sem classificação', async () => {
    const { service } = setup();
    await expect(
      service.criar(user, {
        clienteId: 'c1',
        titulo: 'Proposta',
        etapa: 'PERDIDO',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('não aceita categoria arbitrária pela rota de etapa', async () => {
    const { service } = setup();
    await expect(
      service.atualizarEtapa(user, 'o1', {
        etapa: 'PERDIDO',
        motivoPerda: 'texto livre',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('a rota de status do cliente também exige motivo', async () => {
    const { clients } = setup();
    await expect(
      clients.updateOpportunityStatus(user, 'c1', 'o1', 'LOST'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('salvar a mesma classificação não inventa uma mudança no histórico', async () => {
    const { service, row, tx } = setup();
    row.status='LOST'; row.stage='PERDIDO'; row.motivoPerda='CONCORRENTE'; row.lostReason='Concorrente escolhido';
    await service.atualizar(user,'o1',{motivoPerda:'CONCORRENTE'});
    expect(tx.timelineEvent.create).not.toHaveBeenCalled();
  });

});
