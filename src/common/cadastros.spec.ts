/* Os bancos em memória preservam a interface assíncrona do Prisma. */
/* eslint-disable @typescript-eslint/require-await */
import {
  garantirCadastroLead,
  removerCadastroLead,
  sincronizarContatoLead,
} from './cadastros';
import { Prisma } from '@prisma/client';

describe('Cadastro compartilhado de leads', () => {
  const lead = {
    id: 'lead-1',
    name: 'Maria',
    company: 'Empresa A',
    email: 'maria@empresa.com',
    phone: '41999999999',
    notes: 'Observação original',
    createdById: 'usuario-1',
    createdAt: new Date('2026-10-10'),
    prospectedById: null,
    prospectedByName: null,
    cadastroId: null,
    convertidoParaCliente: false,
  };
  function banco() {
    const cadastros: Record<string, unknown>[] = [];
    let vinculo: string | null = null;
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      lead: {
        findUniqueOrThrow: jest.fn(async () => ({
          ...lead,
          cadastroId: vinculo,
        })),
        update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          vinculo = data.cadastroId as string;
          return { ...lead, ...data };
        }),
      },
      client: {
        findUniqueOrThrow: jest.fn(
          async ({ where }: { where: { id: string } }) =>
            cadastros.find((item) => item.id === where.id) ?? null,
        ),
        findMany: jest.fn(async () => cadastros),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const item = { ...data, id: 'cadastro-1' };
          cadastros.push(item);
          return item;
        }),
      },
    };
    return {
      tx: tx as unknown as Prisma.TransactionClient,
      cadastros,
      vinculo: () => vinculo,
    };
  }

  it('cria lead com contato principal sem marcar venda ou criar usuário', async () => {
    const db = banco();
    const cadastro = await garantirCadastroLead(db.tx, lead);
    expect(cadastro).toMatchObject({
      id: 'cadastro-1',
      modalidadeCadastro: 'LEAD',
      companyName: 'Empresa A',
      sourceLeadId: 'lead-1',
    });
    expect(db.cadastros[0]).toMatchObject({
      contacts: {
        create: { name: 'Maria', email: 'maria@empresa.com', isPrimary: true },
      },
    });
    expect(db.cadastros[0]).not.toHaveProperty('user');
    expect(db.vinculo()).toBe('cadastro-1');
  });

  it('reutiliza cadastro e contato ao processar novamente o mesmo lead', async () => {
    const db = banco();
    const primeiro = await garantirCadastroLead(db.tx, lead);
    const segundo = await garantirCadastroLead(db.tx, lead);
    expect(segundo.id).toBe(primeiro.id);
    expect(db.cadastros).toHaveLength(1);
  });

  it('não escolhe arbitrariamente entre clientes antigos com a mesma origem', async () => {
    const db = banco();
    db.cadastros.push({ id: 'cliente-a' }, { id: 'cliente-b' });
    await expect(garantirCadastroLead(db.tx, lead)).rejects.toThrow(
      'mais de um cadastro',
    );
    expect(db.vinculo()).toBeNull();
  });

  it('remove o cadastro compartilhado ao excluir um lead sem oportunidades', async () => {
    const cadastros = [
      { id: 'cadastro-1', modalidadeCadastro: 'LEAD', opportunities: [] },
    ];
    const tx = {
      client: {
        findUnique: async () => cadastros[0],
        delete: async () => cadastros.pop(),
      },
    } as unknown as Prisma.TransactionClient;
    await removerCadastroLead(tx, { cadastroId: 'cadastro-1' });
    expect(cadastros).toEqual([]);
  });

  it('preserva o cadastro quando o lead tem oportunidades registradas', async () => {
    const tx = {
      client: {
        findUnique: async () => ({
          modalidadeCadastro: 'LEAD',
          opportunities: [{ id: 'o1' }],
        }),
      },
    } as unknown as Prisma.TransactionClient;
    await expect(
      removerCadastroLead(tx, { cadastroId: 'cadastro-1' }),
    ).rejects.toThrow('oportunidades');
  });

  it('mantém o lead encontrável após editar o contato principal do cadastro', async () => {
    const lead = {
      name: 'Nome antigo',
      email: 'antigo@example.invalid',
      normalizedPhone: '111',
    };
    const tx = {
      lead: {
        updateMany: async ({ data }: { data: Record<string, unknown> }) =>
          Object.assign(lead, data),
      },
    } as unknown as Prisma.TransactionClient;
    await sincronizarContatoLead(tx, 'cadastro-1', {
      name: 'Maria',
      email: 'Maria@Empresa.com',
      phone: '(41) 99999-9999',
      isPrimary: true,
    });
    expect(lead).toMatchObject({
      name: 'Maria',
      email: 'Maria@Empresa.com',
      normalizedEmail: 'maria@empresa.com',
      normalizedPhone: '41999999999',
    });
  });
});
