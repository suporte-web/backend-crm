import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { GestaoProspeccoesService } from './gestao-prospeccoes.service';

const comercial: AuthUser = {
  sub: 'v1',
  email: 'v@crm.test',
  role: UserRole.COMERCIAL,
};
const date = new Date('2026-10-14T12:00:00Z');

describe('Gestão de Prospecções', () => {
  const delegate = () => ({
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
  });
  let prisma: {
    lead: ReturnType<typeof delegate>;
    prospect: ReturnType<typeof delegate>;
    client: ReturnType<typeof delegate>;
  };
  let service: GestaoProspeccoesService;
  beforeEach(async () => {
    prisma = { lead: delegate(), prospect: delegate(), client: delegate() };
    const module = await Test.createTestingModule({
      providers: [
        GestaoProspeccoesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(GestaoProspeccoesService);
  });

  it.each([
    UserRole.CONSULTORA,
    UserRole.MARKETING,
    UserRole.CLIENTE,
    UserRole.OPERACAO,
  ])('nega todas as consultas para %s antes do banco', async (role) => {
    const user: AuthUser = { ...comercial, role };
    await expect(service.listar(user, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.opcoes(user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.historico(user, 'CLIENTE', 'c1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.client.findUnique).not.toHaveBeenCalled();
    expect(prisma.lead.findMany).not.toHaveBeenCalled();
  });
  it.each([UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL])(
    'permite %s',
    async (role) => {
      await expect(
        service.listar({ ...comercial, role }, {}),
      ).resolves.toMatchObject({ total: 0 });
    },
  );
  it('aceita Comercial como perfil adicional', async () => {
    await expect(
      service.listar(
        {
          ...comercial,
          role: UserRole.MARKETING,
          roles: [UserRole.MARKETING, UserRole.COMERCIAL],
        },
        {},
      ),
    ).resolves.toMatchObject({ total: 0 });
  });
  it('filtra no banco e exclui das etapas anteriores os cadastros convertidos', async () => {
    await service.listar(comercial, {
      consultoraId: 'c1',
      criadoDe: '2026-10-14',
      criadoAte: '2026-10-14',
    });
    for (const entity of [prisma.lead]) {
      expect(entity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            prospectedById: 'c1',
            createdAt: {
              gte: new Date('2026-10-14T03:00:00Z'),
              lt: new Date('2026-10-15T03:00:00Z'),
            },
          }),
        }),
      );
    }
    expect(prisma.lead.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        convertidoParaCliente: false,
        convertedProspect: null,
        convertedClients: { none: {} },
      }),
    });
    expect(prisma.prospect.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ convertedClients: { none: {} } }),
    });
  });
  it('não ignora status incompatível com enum Prospect', async () => {
    expect(
      (
        await service.listar(comercial, {
          tipo: 'PROSPECT',
          status: 'inexistente',
        })
      ).total,
    ).toBe(0);
    expect(prisma.prospect.findMany).not.toHaveBeenCalled();
  });
  it('entrega indicadores e paginação com dados das entidades existentes', async () => {
    prisma.lead.findMany.mockResolvedValue([
      { id: 'l1', name: 'Lead', createdAt: date },
    ]);
    prisma.client.findMany.mockResolvedValue([
      {
        id: 'c1',
        companyName: 'Cliente',
        createdAt: new Date(date.getTime() + 1),
      },
    ]);
    prisma.lead.count.mockResolvedValue(1);
    prisma.client.count.mockResolvedValue(1);
    const result = await service.listar(comercial, { tamanho: 1, pagina: 2 });
    expect(result).toMatchObject({
      total: 2,
      indicadores: { leads: 1, prospects: 0, clientes: 1 },
    });
    expect(result.registros.map((item) => item.id)).toEqual(['l1']);
  });
  it('mantém visível prospect reutilizado sem substituir autoria original', async () => {
    prisma.prospect.findMany.mockResolvedValue([
      {
        id: 'p1',
        nomeRazaoSocial: 'Existente',
        statusCadastral: 'PROSPECT',
        createdAt: date,
        sourceLeadId: null,
        sourceLead: null,
        prospectedById: 'outra',
        prospectedByName: 'Outra',
        convertedLeads: [
          { id: 'l1', prospectedById: 'carla', prospectedByName: 'Carla' },
        ],
      },
    ]);
    prisma.prospect.count.mockResolvedValue(1);
    const result = await service.listar(comercial, {
      tipo: 'PROSPECT',
      consultoraId: 'carla',
    });
    expect(result.registros).toEqual([
      expect.objectContaining({
        id: 'p1',
        tipo: 'PROSPECT',
        prospectedById: 'carla',
        href: '/leads/l1',
      }),
    ]);
    expect(prisma.prospect.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              convertedLeads: {
                some: {
                  prospectedById: 'carla',
                  prospectedByName: { not: null },
                },
              },
            },
          ]),
        }),
      }),
    );
  });
  it('mantém consultora histórica nas opções mesmo sem usuário ativo', async () => {
    prisma.client.findMany.mockResolvedValue([
      { prospectedById: 'u1', prospectedByName: 'Carla', status: 'ATIVO' },
    ]);
    prisma.lead.findMany.mockResolvedValue([
      {
        prospectedById: 'u1',
        prospectedByName: 'Carla',
        status: 'entrada_leads',
      },
    ]);
    expect(await service.opcoes(comercial)).toEqual({
      consultoras: [{ id: 'u1', nome: 'Carla' }],
      status: ['ATIVO', 'entrada_leads'],
    });
  });
  it('reúne observações e interações no cliente e deduplica evolução', async () => {
    const lead = {
      id: 'l1',
      createdAt: date,
      notes: 'Contato inicial',
      timeline: [
        {
          id: 'e1',
          type: 'UPDATED',
          title: 'Contato',
          description: 'Ligação',
          createdAt: date,
          createdBy: null,
        },
      ],
      observations: [
        {
          id: 'o1',
          content: 'Solicitou proposta',
          createdAt: date,
          createdBy: { id: 'u1', name: 'Carla' },
        },
      ],
    };
    prisma.client.findUnique.mockResolvedValue({
      id: 'c1',
      createdAt: date,
      prospectedByName: 'Carla',
      notes: null,
      sourceLead: lead,
      timelineEvents: [],
      sourceProspect: {
        id: 'p1',
        createdAt: date,
        sourceLead: lead,
        convertedLeads: [lead],
      },
    });
    const result = await service.historico(comercial, 'CLIENTE', 'c1');
    expect(result.eventos).toHaveLength(2);
    expect(result.eventos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'o1',
          type: 'OBSERVACAO',
          description: 'Solicitou proposta',
        }),
      ]),
    );
    expect(result.evolucao.map((item) => item.tipo)).toEqual([
      'LEAD',
      'PROSPECT',
      'CLIENTE',
    ]);
    expect(result.observacoes).toBe('Contato inicial');
  });
  it('reconstitui histórico pelo prospect sem vínculo direto com Lead', async () => {
    prisma.client.findUnique.mockResolvedValue({
      id: 'c1',
      createdAt: date,
      prospectedByName: 'Carla',
      notes: null,
      sourceLead: null,
      timelineEvents: [],
      sourceProspect: {
        id: 'p1',
        createdAt: date,
        sourceLead: {
          id: 'l1',
          createdAt: date,
          notes: 'Anterior',
          timeline: [],
          observations: [],
        },
        convertedLeads: [],
      },
    });
    expect(
      (await service.historico(comercial, 'CLIENTE', 'c1')).observacoes,
    ).toBe('Anterior');
  });
  it('mantém no cliente a origem de leads vinculados a um prospect compartilhado', async () => {
    prisma.client.findMany.mockResolvedValue([
      {
        id: 'c1',
        companyName: 'Convertido',
        createdAt: date,
        prospectedById: null,
        prospectedByName: null,
        sourceLead: null,
        sourceProspect: {
          prospectedById: null,
          prospectedByName: null,
          sourceLead: null,
          convertedLeads: [
            { prospectedById: 'carla', prospectedByName: 'Carla' },
          ],
        },
      },
    ]);
    prisma.client.count.mockResolvedValue(1);
    const result = await service.listar(comercial, {
      tipo: 'CLIENTE',
      consultoraId: 'carla',
    });
    expect(result.registros).toEqual([
      expect.objectContaining({
        id: 'c1',
        tipo: 'CLIENTE',
        prospectedById: 'carla',
      }),
    ]);
    expect(prisma.client.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          {
            sourceProspect: {
              OR: expect.arrayContaining([
                {
                  convertedLeads: {
                    some: {
                      prospectedById: 'carla',
                      prospectedByName: { not: null },
                    },
                  },
                },
              ]),
            },
          },
        ]),
      }),
    });
  });
  it.each(['LEAD', 'PROSPECT', 'CLIENTE'] as const)(
    'retorna 404 para %s ausente ou sem origem consultora',
    async (tipo) => {
      await expect(
        service.historico(comercial, tipo, 'outro'),
      ).rejects.toBeInstanceOf(NotFoundException);
      const entity =
        tipo === 'LEAD'
          ? prisma.lead
          : tipo === 'PROSPECT'
            ? prisma.prospect
            : prisma.client;
      expect(entity.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining(
            tipo === 'LEAD'
              ? { id: 'outro', prospectedByName: { not: null } }
              : tipo === 'PROSPECT'
                ? { id: 'outro', OR: expect.any(Array) }
                : {
                    id: 'outro',
                    AND: expect.objectContaining({ OR: expect.any(Array) }),
                  },
          ),
        }),
      );
    },
  );
});
