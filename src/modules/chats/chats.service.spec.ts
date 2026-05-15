import { NotFoundException } from '@nestjs/common';
import {
  ChatMessageVisibility,
  StatusProposta,
  TicketStatus,
  TicketType,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import { ChatsService } from './chats.service';
import { TicketsService } from '../tickets/tickets.service';
import { UserRole } from '../auth/enums/user-role.enum';

describe('ChatsService visibility rules', () => {
  const auditLogsService = {
    create: jest.fn(),
  };

  function createService(prisma: Record<string, unknown>) {
    return new ChatsService(prisma as never, auditLogsService as never);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cliente não vê mensagens internas', () => {
    const service = createService({});

    expect(
      service.canViewVisibility(
        PrismaUserRole.CLIENTE,
        ChatMessageVisibility.INTERNA,
        true,
        false,
      ),
    ).toBe(false);
  });

  it('comercial vê mensagens gestão/comercial quando participante', () => {
    const service = createService({});

    expect(
      service.canViewVisibility(
        PrismaUserRole.COMERCIAL,
        ChatMessageVisibility.GESTAO_COMERCIAL,
        true,
        false,
      ),
    ).toBe(true);
  });

  it('API filtra mensagens não autorizadas antes de retornar ao cliente', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = createService({
      chat: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'chat-1',
          participants: [
            {
              userId: 'client-user',
              canRead: true,
              canWrite: true,
              user: { id: 'client-user', role: PrismaUserRole.CLIENTE },
            },
          ],
        }),
      },
      chatMessage: {
        findMany,
      },
    });

    await service.findMessages(
      { sub: 'client-user', role: UserRole.CLIENTE, email: 'c@x.test' },
      'chat-1',
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          chatId: 'chat-1',
          deletedAt: null,
          OR: [
            { visibility: ChatMessageVisibility.PUBLICA_CLIENTE },
            {
              visibility: ChatMessageVisibility.PRIVADA_USUARIOS,
              recipients: { some: { userId: 'client-user' } },
            },
          ],
        }),
      }),
    );
  });

  it('API bloqueia chamada direta de usuário que não participa do chat', async () => {
    const service = createService({
      chat: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'chat-1',
          participants: [
            {
              userId: 'other-user',
              canRead: true,
              canWrite: true,
              user: { id: 'other-user', role: PrismaUserRole.COMERCIAL },
            },
          ],
        }),
      },
      chatMessage: {
        findMany: jest.fn(),
      },
    });

    await expect(
      service.findMessages(
        { sub: 'client-user', role: UserRole.CLIENTE, email: 'c@x.test' },
        'chat-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('mensagem privada só fica visivel para usuário explicitamente autorizado', () => {
    const service = createService({});

    expect(
      service.canViewVisibility(
        PrismaUserRole.COMERCIAL,
        ChatMessageVisibility.PRIVADA_USUARIOS,
        true,
        true,
      ),
    ).toBe(true);
    expect(
      service.canViewVisibility(
        PrismaUserRole.COMERCIAL,
        ChatMessageVisibility.PRIVADA_USUARIOS,
        true,
        false,
      ),
    ).toBe(false);
  });

  it('envia mensagem publica quando visibilidade não foi informada', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'message-1',
      chatId: 'chat-1',
      authorId: 'client-user',
      content: 'Ola',
      visibility: ChatMessageVisibility.PUBLICA_CLIENTE,
    });
    const service = createService({
      $transaction: jest.fn((callback) =>
        callback({
          chat: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'chat-1',
              participants: [
                {
                  userId: 'client-user',
                  canRead: true,
                  canWrite: true,
                  user: { id: 'client-user', role: PrismaUserRole.CLIENTE },
                },
              ],
            }),
          },
          chatMessage: {
            create,
          },
        }),
      ),
    });

    await service.sendMessage(
      { sub: 'client-user', role: UserRole.CLIENTE, email: 'c@x.test' },
      'chat-1',
      { content: 'Ola' } as never,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibility: ChatMessageVisibility.PUBLICA_CLIENTE,
        }),
      }),
    );
  });

  it('admin lista todos os chats sem filtro de participante', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = createService({
      chat: {
        findMany,
      },
    });

    await service.findAll({
      sub: 'admin-user',
      role: UserRole.ADMIN,
      email: 'admin@x.test',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });

  it('admin abre mensagens de chat mesmo sem participante direto', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = createService({
      chat: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'chat-1',
          participants: [],
        }),
      },
      chatMessage: {
        findMany,
      },
    });

    await service.findMessages(
      { sub: 'admin-user', role: UserRole.ADMIN, email: 'admin@x.test' },
      'chat-1',
    );

    expect(findMany).toHaveBeenCalled();
  });
});

describe('TicketsService segmented access', () => {
  function createTicketsService(input: {
    prisma: Record<string, unknown>;
    notifications?: Record<string, unknown>;
    chats?: Record<string, unknown>;
    audit?: Record<string, unknown>;
  }) {
    return new TicketsService(
      input.prisma as never,
      (input.audit ?? { create: jest.fn() }) as never,
      (input.notifications ?? {
        markTicketNotificationsRead: jest.fn(),
        notifyUsers: jest.fn(),
        notifyRoles: jest.fn(),
        getUserIdsByRoles: jest.fn().mockResolvedValue([]),
      }) as never,
      (input.chats ?? {
        ensureTicketChat: jest.fn(),
        createMessageInTransaction: jest.fn(),
      }) as never,
    );
  }

  it('gestão vê tickets criados por ela', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = createTicketsService({
      prisma: {
        ticket: {
          findMany,
        },
      },
    });

    await service.findAll({ sub: 'gestao-user', role: UserRole.GESTAO }, {});

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            expect.objectContaining({
              OR: expect.arrayContaining([{ requesterId: 'gestao-user' }]),
            }),
          ],
        },
      }),
    );
  });

  it('cliente não recebe notificação de mensagem interna', async () => {
    const ticket = {
      id: 'ticket-1',
      subject: 'Ticket interno',
      status: TicketStatus.EM_ANDAMENTO,
      type: TicketType.LEAD,
      internalOnly: true,
      requesterId: 'gestao-user',
      assignedToId: 'commercial-user',
      clientId: 'client-1',
      leadId: 'lead-1',
      quoteId: null,
      client: { userId: 'client-user' },
    };
    const notifyUsers = jest.fn();
    const service = createTicketsService({
      prisma: {
        ticket: {
          findUnique: jest.fn().mockResolvedValue(ticket),
        },
        $transaction: jest.fn((callback) =>
          callback({
            ticket: {
              update: jest.fn().mockResolvedValue(ticket),
            },
          }),
        ),
      },
      notifications: {
        markTicketNotificationsRead: jest.fn(),
        notifyUsers,
        notifyRoles: jest.fn(),
        getUserIdsByRoles: jest.fn().mockResolvedValue([]),
      },
      chats: {
        ensureTicketChat: jest.fn().mockResolvedValue({ id: 'chat-1' }),
        createMessageInTransaction: jest.fn(),
      },
    });

    await service.reply(
      { sub: 'gestao-user', role: UserRole.GESTAO, email: 'g@x.test' },
      'ticket-1',
      { message: 'Ajustar lead', isInternal: true },
    );

    expect(notifyUsers).not.toHaveBeenCalledWith(
      expect.arrayContaining(['client-user']),
      expect.anything(),
      expect.anything(),
    );
  });

  it('recusa do cliente notifica comercial e gestão', async () => {
    const ticket = {
      id: 'ticket-1',
      subject: 'Proposta',
      status: TicketStatus.AGUARDANDO_CLIENTE,
      type: TicketType.PRE_NEGOCIACAO,
      internalOnly: false,
      requesterId: 'commercial-user',
      assignedToId: 'commercial-user',
      clientId: 'client-1',
      leadId: null,
      quoteId: null,
      opportunityId: null,
      client: {
        userId: 'client-user',
        companyName: 'Cliente',
        user: { name: 'Cliente', email: 'cliente@x.test' },
      },
    };
    const notifyUsers = jest.fn().mockResolvedValue({ count: 1 });
    const notifyRoles = jest.fn().mockResolvedValue({ count: 1 });
    const service = createTicketsService({
      prisma: {
        ticket: {
          findUnique: jest.fn().mockResolvedValue(ticket),
        },
        $transaction: jest.fn((callback) =>
          callback({
            proposta: {
              findFirst: jest.fn().mockResolvedValue({
                id: 'proposta-1',
                status: StatusProposta.ENVIADA_AO_CLIENTE,
                motivoRecusaCliente: null,
              }),
              update: jest.fn(),
            },
            ticket: {
              update: jest.fn().mockResolvedValue({
                ...ticket,
                status: TicketStatus.REPROVADO,
              }),
            },
          }),
        ),
      },
      notifications: {
        markTicketNotificationsRead: jest.fn(),
        notifyUsers,
        notifyRoles,
        getUserIdsByRoles: jest.fn().mockResolvedValue([]),
      },
      chats: {
        ensureTicketChat: jest.fn().mockResolvedValue({ id: 'chat-1' }),
        createMessageInTransaction: jest.fn(),
      },
    });

    await service.clientDecision(
      { sub: 'client-user', role: UserRole.CLIENTE, email: 'c@x.test' },
      'ticket-1',
      { action: 'REJECT', message: 'Valor fora do esperado' },
    );

    expect(notifyUsers).toHaveBeenCalledWith(
      ['commercial-user'],
      expect.objectContaining({
        title: 'Cliente recusou a pré-negociacao',
      }),
      expect.anything(),
    );
    expect(notifyRoles).toHaveBeenCalledWith(
      [UserRole.GESTAO, UserRole.ADMIN],
      expect.objectContaining({
        title: 'Cliente recusou a pré-negociacao',
      }),
      expect.anything(),
    );
  });
});
