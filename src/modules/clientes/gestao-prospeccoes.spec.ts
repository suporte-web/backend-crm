import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../auth/types/auth-user.type';

describe('Gestão de Prospecções', () => {
  const comercial: AuthUser = {
    sub: 'vendedor',
    role: UserRole.COMERCIAL,
    email: 'v@example.test',
  };
  let service: any;
  beforeEach(() => {
    const {
      GestaoProspeccoesService,
    } = require('./gestao-prospeccoes.service');
    const c1 = { id: 'c1', name: 'Maria' },
      c2 = { id: 'c2', name: 'Ana' };
    const createdAt = new Date('2026-10-20T12:00:00Z');
    const prisma = {
      roleScreenPermission: { findMany: async () => [] },
      user: { findMany: async () => [c1, c2] },
      lead: {
        findMany: async () => [
          {
            id: 'l1',
            name: 'Lead A',
            company: 'Empresa A',
            status: 'venda_efetivada',
            createdById: 'c1',
            createdBy: c1,
            metadata: { clientId: 'cliente' },
            createdAt,
            notes: 'Contato inicial',
            timeline: [
              {
                id: 'e1',
                title: 'Ligação',
                description: 'Interessado',
                createdAt,
                createdBy: c1,
              },
            ],
          },
          {
            id: 'l2',
            name: 'Lead B',
            status: 'entrada_leads',
            createdById: 'c2',
            createdBy: c2,
            metadata: {},
            createdAt,
            timeline: [],
          },
        ],
      },
      client: {
        findMany: async () => [
          {
            id: 'cliente',
            companyName: 'Empresa A',
            internalOwnerId: 'vendedor',
            status: 'ATIVO',
            createdAt,
            timelineEvents: [
              {
                id: 'e2',
                type: 'LEAD_CREATED',
                createdById: 'vendedor',
                title: 'Convertido',
                createdAt,
                description: 'Cliente ativo',
              },
            ],
          },
        ],
      },
      prospect: { findMany: async () => [] },
    };
    service = new GestaoProspeccoesService(prisma);
  });

  it('Comercial consulta as prospecções de todas as consultoras e seus indicadores', async () => {
    const resultado = await service.findAll(comercial, {});
    expect(resultado.total).toBe(3);
    expect(resultado.indicadores).toEqual({
      leads: 2,
      prospects: 0,
      clientes: 1,
    });
    expect(resultado.registros.find((r: any) => r.id === 'cliente')).toEqual(
      expect.objectContaining({ prospectedByName: 'Maria', tipo: 'CLIENTE' }),
    );
  });
  it('aplica consultora, tipo, status, período e paginação', async () => {
    const resultado = await service.findAll(comercial, {
      consultoraId: 'c1',
      tipo: 'CLIENTE',
      status: 'ATIVO',
      criadoDe: '2026-10-20',
      criadoAte: '2026-10-20',
      pagina: 1,
      tamanho: 1,
    });
    expect(resultado.registros.map((r: any) => r.id)).toEqual(['cliente']);
    expect(resultado.total).toBe(1);
    expect(
      (await service.findAll(comercial, { criadoAte: '2026-10-19' })).total,
    ).toBe(0);
  });
  it('mostra histórico da origem e da conversão mesmo após atribuição ao Comercial', async () => {
    const historico = await service.history(comercial, 'CLIENTE', 'cliente');
    expect(historico.consultora).toBe('Maria');
    expect(historico.eventos.map((e: any) => e.id)).toEqual(
      expect.arrayContaining(['e1', 'e2']),
    );
    expect(historico.evolucao.map((e: any) => e.tipo)).toEqual([
      'LEAD',
      'CLIENTE',
    ]);
  });
  it('carrega opções das consultoras e status', async () => {
    const opcoes = await service.options(comercial);
    expect(opcoes.consultoras).toEqual([
      { id: 'c1', nome: 'Maria' },
      { id: 'c2', nome: 'Ana' },
    ]);
    expect(opcoes.status).toEqual(
      expect.arrayContaining(['ATIVO', 'entrada_leads']),
    );
  });
  it.each([UserRole.CONSULTORA, UserRole.MARKETING, UserRole.CLIENTE])(
    'nega dados gerenciais para %s',
    async (role) => {
      await expect(
        service.findAll({ ...comercial, role }, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.options({ ...comercial, role }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.history({ ...comercial, role }, 'LEAD', 'l1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );
  it('não aceita paginação e período inválidos', async () => {
    await expect(service.findAll(comercial, { pagina: 0 })).rejects.toThrow();
    await expect(
      service.findAll(comercial, { criadoDe: 'invalido' }),
    ).rejects.toThrow();
  });
});
