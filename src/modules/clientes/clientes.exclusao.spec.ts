import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ClientsService } from './clients.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

describe('Exclusão de cadastros com histórico', () => {
  const montar = () => {
    const cadastro = {
      id: 'c1',
      companyName: 'Empresa',
      modalidadeCadastro: 'CLIENTE',
      userId: null,
      user: null,
      opportunities: [{ id: 'o1' }],
      timelineEvents: [{ title: 'Contato' }],
    };
    const delegado = () => ({
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn(),
      create: jest.fn(),
    });
    const db = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      client: delegado(),
      lead: delegado(),
      clientDeletionRequest: delegado(),
      leadDeletionRequest: delegado(),
      timelineEvent: delegado(),
      ticket: delegado(),
      chat: delegado(),
      quote: delegado(),
      proposta: delegado(),
      leadImportRowResult: delegado(),
      auditLog: delegado(),
      user: delegado(),
      $transaction: jest.fn(),
    };
    db.client.findUnique.mockResolvedValue(cadastro);
    db.clientDeletionRequest.create.mockResolvedValue({
      id: 'r1',
      status: 'PENDENTE',
    });
    db.$transaction.mockImplementation((acao: (tx: typeof db) => unknown) =>
      acao(db),
    );
    const servico = new ClientsService(
      db as unknown as PrismaService,
      { create: jest.fn() } as unknown as AuditLogsService,
      { notifyRoles: jest.fn() } as unknown as NotificationsService,
      {} as UsersService,
    );
    return { db, servico };
  };

  it.each([UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL])(
    'permite %s excluir diretamente mesmo com oportunidades e histórico',
    async (role) => {
      const { db, servico } = montar();
      const resultado = await servico.requestDeletion(
        { sub: 'autor', email: 'teste@example.invalid', role },
        'c1',
        { reason: 'Duplicado' },
      );
      expect(resultado).toMatchObject({ status: 'APROVADA' });
      expect(db.client.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(db.auditLog.create).toHaveBeenCalled();
      expect(db.clientDeletionRequest.create).not.toHaveBeenCalled();
      expect(db.quote.updateMany).toHaveBeenCalledWith({
        where: { clientId: 'c1' },
        data: { clientId: null },
      });
    },
  );

  it('não permite exclusão direta por Marketing', async () => {
    const { db, servico } = montar();
    await expect(
      servico.requestDeletion(
        {
          sub: 'autor',
          email: 'teste@example.invalid',
          role: UserRole.MARKETING,
        },
        'c1',
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.client.delete).not.toHaveBeenCalled();
  });

  it('mantém a solicitação de aprovação para Consultora', async () => {
    const { db, servico } = montar();
    expect(
      await servico.requestDeletion(
        {
          sub: 'autora',
          email: 'teste@example.invalid',
          role: UserRole.CONSULTORA,
        },
        'c1',
        { reason: 'Duplicado' },
      ),
    ).toMatchObject({ status: 'PENDENTE' });
    expect(db.client.delete).not.toHaveBeenCalled();
  });

  it('considera Comercial entre os perfis adicionais do usuário', async () => {
    const { db, servico } = montar();
    expect(
      await servico.requestDeletion(
        {
          sub: 'autor',
          email: 'teste@example.invalid',
          role: UserRole.CONSULTORA,
          roles: [UserRole.CONSULTORA, UserRole.COMERCIAL],
        },
        'c1',
        {},
      ),
    ).toMatchObject({ status: 'APROVADA' });
    expect(db.client.delete).toHaveBeenCalled();
  });
});
