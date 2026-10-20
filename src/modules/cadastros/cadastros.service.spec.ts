/* Os bancos em memória preservam a interface assíncrona do Prisma. */
/* eslint-disable @typescript-eslint/require-await */
import { CadastrosService } from './cadastros.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('Modalidade do cadastro', () => {
  const usuario = {
    sub: 'comercial-1',
    email: 'teste@empresa.com',
    role: UserRole.COMERCIAL,
  };
  function banco(tipo: 'CLIENTE' | 'LEAD' = 'LEAD') {
    const cadastro = {
      id: 'cadastro-1',
      modalidadeCadastro: tipo,
      document: '12345678000199',
      companyName: 'Empresa A',
      internalOwnerId: usuario.sub,
    };
    let lead = {
      id: 'lead-1',
      cadastroId: cadastro.id,
      status: 'cotacao',
      convertidoParaCliente: false,
      metadata: { origem: 'site', personalizado: 'preservar' },
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      client: {
        findUnique: jest.fn(async () => cadastro),
        findFirst: jest.fn(async () => null),
        update: jest.fn(async ({ data }: { data: Record<string, unknown> }) =>
          Object.assign(cadastro, data),
        ),
      },
      lead: {
        findUnique: jest.fn(async () => lead),
        update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          lead = { ...lead, ...data };
          return lead;
        }),
      },
      auditLog: { create: jest.fn(async () => ({})) },
      timelineEvent: {
        create: jest.fn(
          async ({ data }: { data: Record<string, unknown> }) => data,
        ),
      },
    };
    const prisma = {
      ...tx,
      roleScreenPermission: { findMany: jest.fn(async () => []) },
      $transaction: async (fn: (value: unknown) => unknown) => fn(tx),
    };
    return {
      service: new CadastrosService(prisma as unknown as PrismaService),
      cadastro,
      lead: () => lead,
      prisma,
    };
  }

  it('promove o mesmo cadastro e preserva os metadados do funil', async () => {
    const db = banco();
    const resultado = await db.service.alterarModalidade(
      usuario,
      'cadastro-1',
      { modalidadeCadastro: 'CLIENTE' },
    );
    expect(resultado).toMatchObject({
      id: 'cadastro-1',
      modalidadeCadastro: 'CLIENTE',
    });
    expect(db.lead()).toMatchObject({
      convertidoParaCliente: true,
      status: 'venda_efetivada',
      metadata: {
        origem: 'site',
        personalizado: 'preservar',
        clientId: 'cadastro-1',
      },
    });
  });

  it('retorna a lead sem apagar a etapa comercial ou recriar o cadastro', async () => {
    const db = banco('CLIENTE');
    const resultado = await db.service.alterarModalidade(
      usuario,
      'cadastro-1',
      { modalidadeCadastro: 'LEAD' },
    );
    expect(resultado.id).toBe('cadastro-1');
    expect(db.lead()).toMatchObject({
      convertidoParaCliente: false,
      status: 'cotacao',
    });
  });

  it('rejeita a promoção sem documento', async () => {
    const db = banco();
    db.cadastro.document = '';
    await expect(
      db.service.alterarModalidade(usuario, 'cadastro-1', {
        modalidadeCadastro: 'CLIENTE',
      }),
    ).rejects.toThrow('documento');
    expect(db.cadastro.modalidadeCadastro).toBe('LEAD');
  });

  it('respeita bloqueio da tela antiga por modalidade, inclusive por ID direto', async () => {
    const db = banco();
    db.prisma.roleScreenPermission.findMany.mockResolvedValue([
      { role: UserRole.COMERCIAL, screenKey: 'leads', isEnabled: false },
    ] as never);
    await expect(db.service.obter(usuario, 'cadastro-1')).rejects.toThrow(
      'permissão',
    );
  });

  it('impede que uma consultora acesse cadastro de outra pessoa por ID direto', async () => {
    const db = banco();
    db.cadastro.internalOwnerId = 'outra-pessoa';
    await expect(
      db.service.obter({ ...usuario, role: UserRole.CONSULTORA }, 'cadastro-1'),
    ).rejects.toThrow('outra pessoa');
  });

  it('cria lead com contato real e dados normalizados para ser encontrado pelos outros canais', async () => {
    let leadSalvo: Record<string, unknown> = {};
    const tx = {
      $queryRaw: async () => [],
      lead: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          leadSalvo = { ...data, id: 'novo-lead', createdAt: new Date() };
          return leadSalvo;
        },
        findFirst: async () => null,
        findUniqueOrThrow: async () => leadSalvo,
        update: async ({ data }: { data: Record<string, unknown> }) =>
          Object.assign(leadSalvo, data),
      },
      client: {
        findMany: async () => [],
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          ...data,
          id: 'novo-cadastro',
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          ...data,
          id: 'novo-cadastro',
        }),
      },
      auditLog: { create: jest.fn(async () => ({})) },
      timelineEvent: { create: async () => ({}) },
    };
    const prisma = {
      ...tx,
      roleScreenPermission: { findMany: async () => [] },
      $transaction: async (fn: (tx: unknown) => unknown) => fn(tx),
    } as unknown as PrismaService;
    await new CadastrosService(prisma).criar(usuario, {
      modalidadeCadastro: 'LEAD',
      name: 'Empresa A',
      companyName: 'Empresa A',
      contacts: [
        { name: 'Maria', email: 'Maria@Empresa.com', phone: '(41) 99999-9999' },
      ],
    });
    expect(leadSalvo).toMatchObject({
      name: 'Maria',
      company: 'Empresa A',
      normalizedEmail: 'maria@empresa.com',
      normalizedPhone: '41999999999',
    });
  });
});
