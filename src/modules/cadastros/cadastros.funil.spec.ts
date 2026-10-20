import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CadastrosService } from './cadastros.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';

describe('Etapa comercial compartilhada pelo cadastro e pelos BIs', () => {
  const autor: AuthUser = {
    sub: 'comercial',
    email: 'teste@example.invalid',
    role: UserRole.COMERCIAL,
  };
  function montar() {
    const cadastro = {
      id: 'c1',
      companyName: 'Empresa',
      modalidadeCadastro: 'CLIENTE',
      phone: '41999999999',
      createdAt: new Date(),
      sourceLeadId: null,
    };
    const db = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      client: {
        findUnique: jest.fn().mockResolvedValue(cadastro),
        create: jest.fn().mockResolvedValue(cadastro),
        update: jest.fn().mockResolvedValue(cadastro),
      },
      clientContact: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ name: 'Maria', email: 'maria@example.invalid' }),
      },
      lead: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: { data: object }) => ({
          id: 'l1',
          ...data,
        })),
        update: jest.fn().mockImplementation(({ data }: { data: object }) => ({
          id: 'l1',
          ...data,
        })),
      },
      timelineEvent: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      roleScreenPermission: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(),
    };
    db.$transaction.mockImplementation((acao: (tx: typeof db) => unknown) =>
      acao(db),
    );
    const servico = new CadastrosService(
      db as unknown as PrismaService,
    ) as CadastrosService & {
      atualizarEtapa: (
        user: typeof autor,
        id: string,
        dto: { etapa: string },
      ) => Promise<unknown>;
    };
    return { db, servico };
  }

  it('inclui novos Clientes no funil, preservando o mesmo cadastro', async () => {
    const { db, servico } = montar();
    await servico.criar(autor, {
      modalidadeCadastro: 'CLIENTE',
      companyName: 'Empresa',
      document: '12345678000199',
    });
    expect(db.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cadastroId: 'c1',
          status: 'venda_efetivada',
        }),
      }),
    );
  });

  it('cria o vínculo de um Cliente antigo ao salvar sua etapa', async () => {
    const { db, servico } = montar();
    await servico.atualizarEtapa(autor, 'c1', { etapa: 'cotacao' });
    expect(db.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cadastroId: 'c1',
          status: 'cotacao',
          normalizedEmail: 'maria@example.invalid',
        }),
      }),
    );
  });

  it('edita a etapa no Lead existente sem criar outro registro', async () => {
    const { db, servico } = montar();
    db.lead.findUnique.mockResolvedValue({
      id: 'l1',
      cadastroId: 'c1',
      status: 'homologacao',
      metadata: { personalizado: 'preservar' },
    });
    await servico.atualizarEtapa(autor, 'c1', { etapa: 'cotacao' });
    expect(db.lead.create).not.toHaveBeenCalled();
    expect(db.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'l1' },
        data: expect.objectContaining({ status: 'cotacao' }),
      }),
    );
  });

  it('impede Marketing de alterar etapas', async () => {
    const { servico } = montar();
    await expect(
      servico.atualizarEtapa({ ...autor, role: UserRole.MARKETING }, 'c1', {
        etapa: 'cotacao',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('salva os dados comerciais sem trocar de etapa e preserva outros metadados', async () => {
    const { db, servico } = montar();
    db.lead.findUnique.mockResolvedValue({
      id: 'l1',
      cadastroId: 'c1',
      status: 'cotacao',
      metadata: { personalizado: 'preservar', nextAction: 'Antiga' },
    });
    const dados = Object.assign(
      { etapa: 'cotacao' },
      {
        proximaAcao: 'Enviar proposta',
        responsavel: 'MCG',
        volumeMensalEstimado: '12.500,50',
      },
    );
    await servico.atualizarEtapa(autor, 'c1', dados);
    expect(db.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            personalizado: 'preservar',
            nextAction: 'Enviar proposta',
            responsible: 'MCG',
            monthlyEstimatedValue: '12.500,50',
          }),
        }),
      }),
    );
  });
});
