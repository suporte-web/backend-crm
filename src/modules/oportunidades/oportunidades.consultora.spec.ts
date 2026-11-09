import { ForbiddenException } from '@nestjs/common';
import { OpportunityStage, UserRole } from '@prisma/client';
import { OportunidadesService as OpportunitiesService } from './oportunidades.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../../prisma/prisma.service';

describe('Oportunidades da Consultora', () => {
  const consultora: AuthUser = {
    sub: 'consultora-1',
    role: UserRole.CONSULTORA,
    email: 'c@example.test',
  };
  const comercial: AuthUser = {
    sub: 'comercial',
    role: UserRole.COMERCIAL,
    email: 'v@example.test',
  };
  const clientes = [
    { id: 'meu', modalidadeCadastro: 'CLIENTE', internalOwnerId: consultora.sub, companyName: 'Empresa A' },
    { id: 'outro', modalidadeCadastro: 'CLIENTE', internalOwnerId: 'consultora-2', companyName: 'Empresa B' },
  ];
  let habilitada: boolean | undefined;
  let oportunidades: Array<Record<string, any>>;
  let notificacoes: Array<Record<string, any>>;
  let service: OpportunitiesService;
  let falharHistorico: boolean;

  beforeEach(() => {
    habilitada = true;
    falharHistorico = false;
    oportunidades = clientes.map((client, i) => ({
      id: `op-${i}`,
      clientId: client.id,
      client,
      title: `Proposta ${i}`,
      stage: OpportunityStage.NOVO,
    }));
    notificacoes = [];
    const usuarios = [
      {
        id: consultora.sub,
        name: 'Maria',
        role: 'CONSULTORA',
        roles: ['CONSULTORA'],
        isActive: true,
      },
      {
        id: 'vendedor',
        name: 'João',
        role: 'COMERCIAL',
        roles: ['COMERCIAL'],
        isActive: true,
      },
      {
        id: 'multiplo',
        name: 'Ana',
        role: 'GESTAO',
        roles: ['GESTAO', 'COMERCIAL'],
        isActive: true,
      },
      {
        id: 'inativo',
        name: 'Inativo',
        role: 'COMERCIAL',
        roles: ['COMERCIAL'],
        isActive: false,
      },
    ];
    const db = {
      roleScreenPermission: {
        findMany: async () => habilitada === undefined ? [] : [{ role: 'CONSULTORA', screenKey: 'opportunities', isEnabled: habilitada }],
        findUnique: async () =>
          habilitada === undefined ? null : { isEnabled: habilitada },
      },
      client: {
        findUnique: async ({ where }: any) =>
          clientes.find((c) => c.id === where.id),
        findMany: async ({ where = {} }: any) =>
          clientes.filter(
            (c) =>
              !where.internalOwnerId ||
              c.internalOwnerId === where.internalOwnerId,
          ),
      },
      opportunity: {
        findMany: async ({ where }: any) =>
          oportunidades.filter(
            (o) =>
              (!where.clientId || o.clientId === where.clientId) &&
              (!where.client?.internalOwnerId ||
                o.client.internalOwnerId === where.client.internalOwnerId),
          ),
        findUnique: async ({ where }: any) =>
          oportunidades.find((o) => o.id === where.id),
        create: async ({ data }: any) => {
          const row = {
            id: 'nova',
            ...data,
            client: clientes.find((c) => c.id === data.clientId),
          };
          oportunidades.push(row);
          return row;
        },
        update: async ({ where, data }: any) => {
          const row = oportunidades.find((o) => o.id === where.id)!;
          Object.assign(row, data);
          return row;
        },
        delete: async ({ where }: any) => {
          oportunidades = oportunidades.filter((o) => o.id !== where.id);
        },
      },
      timelineEvent: {
        create: async () => {
          if (falharHistorico) throw new Error('Falha no histórico');
        },
      },
      user: {
        findUnique: async ({ where }: any) =>
          usuarios.find((u) => u.id === where.id),
        findMany: async ({ where }: any) =>
          usuarios.filter((u) =>
            where.id
              ? where.id.in.includes(u.id)
              : u.isActive &&
                (where.OR[0].role.in.includes(u.role) ||
                  u.roles.some((r) => where.OR[1].roles.hasSome.includes(r))),
          ),
      },
      notification: {
        createMany: async ({ data }: any) => {
          notificacoes.push(...data);
        },
      },
    };
    const prisma = {
      ...db,
      $transaction: async (acao: any) => {
        const anteriores = structuredClone(oportunidades),
          avisos = structuredClone(notificacoes);
        try {
          return await acao(db);
        } catch (erro) {
          oportunidades = anteriores;
          notificacoes = avisos;
          throw erro;
        }
      },
    };
    service = Reflect.construct(OpportunitiesService, [
      prisma,
      { create: async () => {} },
      new NotificationsService(prisma as unknown as PrismaService),
    ]);
  });

  it('lista somente oportunidades dos cadastros sob responsabilidade da Consultora', async () => {
    expect((await service.listar(consultora, {})).map((o) => o.id)).toEqual([
      'op-0',
    ]);
    expect(await service.listar(consultora, { clienteId: 'outro' })).toEqual(
      [],
    );
  });

  it.each([undefined, false])(
    'nega acesso sem permissão habilitada (%p)',
    async (valor) => {
      habilitada = valor;
      await expect(service.listar(consultora, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.criar(consultora, { clienteId: 'meu', titulo: 'Proposta' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );

  it('permite ao Comercial consultar também as informações das consultoras', async () => {
    expect((await service.listar(comercial, {})).map((o) => o.id)).toEqual([
      'op-0',
      'op-1',
    ]);
  });

  it('oferece somente cadastros próprios para novas propostas da Consultora', async () => {
    const listar = (
      service as OpportunitiesService & {
        listarCadastros(user: AuthUser): Promise<Array<{ id: string }>>;
      }
    ).listarCadastros.bind(service);
    expect((await listar(consultora)).map((c) => c.id)).toEqual(['meu']);
    expect((await listar(comercial)).map((c) => c.id)).toEqual([
      'meu',
      'outro',
    ]);
  });

  it.each(['create', 'update', 'updateStage', 'remove'] as const)(
    'bloqueia %s em cadastro de outra consultora',
    async (operacao) => {
      const acao =
        operacao === 'create'
          ? service.criar(consultora, { clienteId: 'outro', titulo: 'Indevida' })
          : operacao === 'update'
            ? service.atualizar(consultora, 'op-1', { titulo: 'Indevida' })
            : operacao === 'updateStage'
              ? service.atualizarEtapa(consultora, 'op-1', {
                  etapa: OpportunityStage.PROPOSTA,
                })
              : service.excluir(consultora, 'op-1');
      await expect(acao).rejects.toBeInstanceOf(ForbiddenException);
      expect(oportunidades.map((o) => o.title)).toEqual([
        'Proposta 0',
        'Proposta 1',
      ]);
      expect(notificacoes).toEqual([]);
    },
  );

  it('notifica os comerciais ativos, inclusive perfis múltiplos, ao criar uma proposta', async () => {
    const proposta = await service.criar(consultora, {
      clienteId: 'meu',
      titulo: 'Armazenagem',
      etapa: OpportunityStage.PROPOSTA,
    });
    expect(proposta.title).toBe('Armazenagem');
    expect(notificacoes.map((n) => n.userId)).toEqual(['vendedor', 'multiplo']);
    expect(notificacoes[0]).toEqual(
      expect.objectContaining({
        title: 'Nova proposta de consultora',
        message: expect.stringContaining('Maria'),
        link: '/oportunidades/cadastro/meu/propostas/nova',
        metadata: expect.objectContaining({
          opportunityId: 'nova',
          clientId: 'meu',
          consultoraId: consultora.sub,
        }),
      }),
    );
  });

  it('não envia aviso de proposta quando a criação falha', async () => {
    falharHistorico = true;
    await expect(
      service.criar(consultora, {
        clienteId: 'meu',
        titulo: 'Armazenagem',
        etapa: OpportunityStage.PROPOSTA,
      }),
    ).rejects.toThrow('Falha no histórico');
    expect(oportunidades).toHaveLength(2);
    expect(notificacoes).toEqual([]);
  });

  it('não gera aviso de Consultora em proposta criada pelo Comercial', async () => {
    await service.criar(comercial, {
      clienteId: 'meu',
      titulo: 'Proposta comercial',
      etapa: OpportunityStage.PROPOSTA,
    });
    expect(notificacoes).toEqual([]);
  });
});
