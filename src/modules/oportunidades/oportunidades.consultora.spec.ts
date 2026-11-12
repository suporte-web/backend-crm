import { ForbiddenException } from '@nestjs/common';
import { OpportunityStage, UserRole } from '@prisma/client';
import { OportunidadesService as OpportunitiesService } from './oportunidades.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../../prisma/prisma.service';

function matches(row: any, where: any = {}): boolean {
  return Object.entries(where).every(([key, value]: [string, any]) => {
    if (value && typeof value === 'object') {
      if ('path' in value) return value.path.reduce((item: any, part: string) => item?.[part], row[key]) === value.equals;
      if ('in' in value) return value.in.includes(row[key]);
      return !!row[key] && matches(row[key], value);
    }
    return row[key] === value;
  });
}

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
    { id: 'meu', modalidadeCadastro: 'CLIENTE', internalOwnerId: consultora.sub, companyName: 'Empresa A', leadCadastro: { metadata: { responsible: 'MCG' } } },
    { id: 'outro', modalidadeCadastro: 'CLIENTE', internalOwnerId: 'consultora-2', companyName: 'Empresa B', leadCadastro: { metadata: { responsible: 'MCG' } } },
    { id: 'nao-mcg', modalidadeCadastro: 'CLIENTE', internalOwnerId: consultora.sub, companyName: 'Empresa C', leadCadastro: { metadata: { responsible: 'OUTRO' } } },
  ];
  let habilitada: boolean | undefined;
  let oportunidades: Array<Record<string, any>>;
  let notificacoes: Array<Record<string, any>>;
  let service: OpportunitiesService;
  let falharHistorico: boolean;
  let eventos: Array<Record<string, any>>;

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
    oportunidades.push(
      { ...oportunidades[0], id: 'op-comercial', title: 'Proposta comercial' },
      { ...oportunidades[1], id: 'op-compartilhada', title: 'Proposta compartilhada' },
    );
    eventos = oportunidades.map((o) => ({
      id: `evento-${o.id}`, clientId: o.clientId, type: 'OPPORTUNITY_CREATED',
      createdById: o.id === 'op-1' ? 'consultora-2' : o.id === 'op-comercial' ? comercial.sub : consultora.sub,
      metadata: { opportunityId: o.id },
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
        findFirst: async ({ where }: any) => clientes.find((c) => matches(c, where)),
        findMany: async ({ where = {} }: any) => clientes.filter((c) => matches(c, where)),
      },
      opportunity: {
        findMany: async ({ where }: any) =>
          oportunidades.filter((o) => matches(o, where)),
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
        findMany: async ({ where }: any) => eventos.filter((event) => matches(event, where)),
        findFirst: async ({ where }: any) => eventos.find((event) => matches(event, where)),
        create: async ({ data }: any) => {
          if (falharHistorico) throw new Error('Falha no histórico');
          const event = { id: `evento-${eventos.length}`, ...data };
          eventos.push(event);
          return event;
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
          avisos = structuredClone(notificacoes),
          historico = structuredClone(eventos);
        try {
          return await acao(db);
        } catch (erro) {
          oportunidades = anteriores;
          notificacoes = avisos;
          eventos = historico;
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

  it('lista somente oportunidades de autoria da Consultora em cadastros MCG', async () => {
    expect((await service.listar(consultora, {})).map((o) => o.id)).toEqual([
      'op-0',
      'op-compartilhada',
    ]);
    expect((await service.listar(consultora, { clienteId: 'outro' })).map((o) => o.id)).toEqual(['op-compartilhada']);
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
      await expect(service.listarCadastros(consultora)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.validarDetalhe(consultora, 'meu')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.atualizar(consultora, 'op-0', { titulo: 'Indevida' })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.atualizarEtapa(consultora, 'op-0', { etapa: OpportunityStage.PROPOSTA })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.excluir(consultora, 'op-0')).rejects.toBeInstanceOf(ForbiddenException);
      expect(oportunidades).toHaveLength(5);
      expect(notificacoes).toEqual([]);
    },
  );

  it('permite ao Comercial consultar também as informações das consultoras', async () => {
    expect((await service.listar(comercial, {})).map((o) => o.id)).toEqual([
      'op-0',
      'op-1',
      'op-2',
      'op-comercial',
      'op-compartilhada',
    ]);
  });

  it('oferece todos os cadastros MCG para novas propostas da Consultora', async () => {
    const listar = (
      service as OpportunitiesService & {
        listarCadastros(user: AuthUser): Promise<Array<{ id: string }>>;
      }
    ).listarCadastros.bind(service);
    expect((await listar(consultora)).map((c) => c.id)).toEqual(['meu', 'outro']);
    expect((await listar(comercial)).map((c) => c.id)).toEqual([
      'meu',
      'outro',
      'nao-mcg',
    ]);
  });

  it.each(['create', 'update', 'updateStage', 'remove'] as const)(
    'bloqueia %s fora de MCG',
    async (operacao) => {
      const acao =
        operacao === 'create'
          ? service.criar(consultora, { clienteId: 'nao-mcg', titulo: 'Indevida' })
          : operacao === 'update'
            ? service.atualizar(consultora, 'op-2', { titulo: 'Indevida' })
            : operacao === 'updateStage'
              ? service.atualizarEtapa(consultora, 'op-2', {
                  etapa: OpportunityStage.PROPOSTA,
                })
              : service.excluir(consultora, 'op-2');
      await expect(acao).rejects.toBeInstanceOf(ForbiddenException);
      expect(oportunidades.map((o) => o.title)).toEqual([
        'Proposta 0',
        'Proposta 1',
        'Proposta 2',
        'Proposta comercial',
        'Proposta compartilhada',
      ]);
      expect(notificacoes).toEqual([]);
    },
  );

  it.each(['op-1', 'op-comercial'])('nega edição, etapa e exclusão de %s sem autoria da Consultora', async (id) => {
    await expect(service.atualizar(consultora, id, { titulo: 'Indevida' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.atualizarEtapa(consultora, id, { etapa: OpportunityStage.PROPOSTA })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.excluir(consultora, id)).rejects.toBeInstanceOf(ForbiddenException);
    expect(oportunidades).toHaveLength(5);
    expect(notificacoes).toEqual([]);
  });

  it('cria proposta em cadastro MCG de outra pessoa e registra a autora da sessão', async () => {
    await service.criar(consultora, { clienteId: 'outro', titulo: 'Compartilhada' });
    expect(eventos[eventos.length - 1]).toEqual(expect.objectContaining({ createdById: consultora.sub, clientId: 'outro', metadata: expect.objectContaining({ opportunityId: 'nova' }) }));
    expect((await service.listar(consultora, {})).map((o) => o.id)).toContain('nova');
  });

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
    expect(oportunidades).toHaveLength(5);
    expect(eventos).toHaveLength(5);
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
