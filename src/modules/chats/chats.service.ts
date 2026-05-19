import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditLogAction,
  AuditLogCategory,
  ChatEntityType,
  ChatMessageVisibility,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UserRole } from '../auth/enums/user-role.enum';
import type { AuthUser } from '../auth/types/auth-user.type';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { UpdateChatMessageDto } from './dto/update-chat-message.dto';
import { UpdateChatParticipantsDto } from './dto/update-chat-participants.dto';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

type ParticipantInput = {
  userId: string;
  canRead?: boolean;
  canWrite?: boolean;
};

type EntityContext = {
  entityType: ChatEntityType;
  entityId: string;
  title?: string | null;
  leadId?: string | null;
  clientId?: string | null;
  quoteId?: string | null;
  propostaId?: string | null;
  ticketId?: string | null;
  defaultParticipants: ParticipantInput[];
  internalOnly?: boolean;
};

type ChatWithParticipants = Prisma.ChatGetPayload<{
  include: {
    participants: {
      include: {
        user: {
          select: {
            id: true;
            role: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class ChatsService {
  private readonly internalRoles = new Set<string>([
    UserRole.ADMIN,
    UserRole.GESTAO,
    UserRole.COMERCIAL,
    UserRole.MARKETING,
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private isInternalRole(role: string) {
    return this.internalRoles.has(role);
  }

  private isGestaoComercialRole(role: string) {
    return this.internalRoles.has(role);
  }

  private stripUnsafeControlCharacters(value: string) {
    let result = '';

    for (const char of value) {
      const code = char.charCodeAt(0);
      const isUnsafeControlCharacter =
        (code >= 0 && code <= 8) ||
        code === 11 ||
        code === 12 ||
        (code >= 14 && code <= 31) ||
        code === 127;

      if (!isUnsafeControlCharacter) {
        result += char;
      }
    }

    return result;
  }

  private sanitizePlainText(value?: string | null) {
    const trimmed = value
      ? this.stripUnsafeControlCharacters(value).trim()
      : null;

    if (!trimmed) {
      return null;
    }

    return trimmed
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private uniqueParticipants(participants: ParticipantInput[]) {
    const byUser = new Map<string, ParticipantInput>();

    for (const participant of participants) {
      if (!participant.userId) {
        continue;
      }

      const existing = byUser.get(participant.userId);
      byUser.set(participant.userId, {
        userId: participant.userId,
        canRead: existing?.canRead ?? participant.canRead ?? true,
        canWrite: existing?.canWrite ?? participant.canWrite ?? true,
      });
    }

    return Array.from(byUser.values());
  }

  private async validateParticipantsExist(
    tx: PrismaClientLike,
    participants: ParticipantInput[],
  ) {
    const userIds = this.uniqueParticipants(participants).map(
      (participant) => participant.userId,
    );

    if (userIds.length === 0) {
      throw new BadRequestException('Informe ao menos um participante.');
    }

    const count = await tx.user.count({
      where: {
        id: {
          in: userIds,
        },
        isActive: true,
      },
    });

    if (count !== userIds.length) {
      throw new BadRequestException('Um ou mais participantes são invalidos.');
    }
  }

  private async upsertChatParticipants(
    tx: PrismaClientLike,
    chatId: string,
    participants: ParticipantInput[],
  ) {
    for (const participant of this.uniqueParticipants(participants)) {
      await tx.chatParticipant.upsert({
        where: {
          chatId_userId: {
            chatId,
            userId: participant.userId,
          },
        },
        update: {
          canRead: participant.canRead ?? true,
          canWrite: participant.canWrite ?? true,
        },
        create: {
          chatId,
          userId: participant.userId,
          canRead: participant.canRead ?? true,
          canWrite: participant.canWrite ?? true,
        },
      });
    }
  }

  private async touchChatAfterMessage(
    tx: PrismaClientLike,
    chatId: string,
    authorId: string,
    messageCreatedAt: Date,
  ) {
    const client = tx as PrismaClientLike & {
      chat?: {
        update?: (args: Prisma.ChatUpdateArgs) => Promise<unknown>;
      };
      chatParticipant?: {
        updateMany?: (
          args: Prisma.ChatParticipantUpdateManyArgs,
        ) => Promise<unknown>;
      };
    };

    if (client.chat?.update) {
      await client.chat.update({
        where: { id: chatId },
        data: {
          updatedAt: messageCreatedAt,
        },
      });
    }

    if (client.chatParticipant?.updateMany) {
      await client.chatParticipant.updateMany({
        where: {
          chatId,
          userId: authorId,
        },
        data: {
          lastReadAt: messageCreatedAt,
        },
      });
    }
  }

  private assertCanManageChat(user: AuthUser, chat: ChatWithParticipants) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    const participant = chat.participants.find(
      (item) => item.userId === user.sub && item.canRead,
    );

    if (!participant) {
      throw new NotFoundException('Chat não encontrado.');
    }

    if (!this.isInternalRole(user.role)) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar este chat.',
      );
    }
  }

  private assertParticipant(
    user: AuthUser,
    chat: ChatWithParticipants,
    requireWrite = false,
  ) {
    const participant = chat.participants.find(
      (item) =>
        item.userId === user.sub &&
        item.canRead &&
        (!requireWrite || item.canWrite),
    );

    if (!participant) {
      if (user.role === UserRole.ADMIN) {
        return null;
      }

      throw new NotFoundException('Chat não encontrado.');
    }

    return participant;
  }

  canViewVisibility(
    userRole: string,
    visibility: ChatMessageVisibility,
    isParticipant: boolean,
    isPrivateRecipient: boolean,
  ) {
    if (!isParticipant) {
      return false;
    }

    if (visibility === ChatMessageVisibility.PUBLICA_CLIENTE) {
      return true;
    }

    if (visibility === ChatMessageVisibility.INTERNA) {
      return this.isInternalRole(userRole);
    }

    if (visibility === ChatMessageVisibility.GESTAO_COMERCIAL) {
      return this.isGestaoComercialRole(userRole);
    }

    return isPrivateRecipient;
  }

  canUseVisibility(userRole: string, visibility: ChatMessageVisibility) {
    if (visibility === ChatMessageVisibility.PUBLICA_CLIENTE) {
      return true;
    }

    return this.isInternalRole(userRole);
  }

  private assertCanUseVisibility(
    user: AuthUser,
    visibility: ChatMessageVisibility,
    authorizedUserIds?: string[],
  ) {
    if (!this.canUseVisibility(user.role, visibility)) {
      throw new ForbiddenException(
        'Você não tem permissão para usar esta visibilidade.',
      );
    }

    if (
      visibility === ChatMessageVisibility.PRIVADA_USUARIOS &&
      (!authorizedUserIds || authorizedUserIds.length === 0)
    ) {
      throw new BadRequestException(
        'Informe usuários autorizados para mensagem privada.',
      );
    }
  }

  private getMessageNotificationRecipients(
    chat: ChatWithParticipants,
    authorId: string,
    visibility: ChatMessageVisibility,
    authorizedUserIds?: string[],
  ) {
    const privateRecipients = new Set(authorizedUserIds ?? []);

    return chat.participants
      .filter((participant) => {
        if (!participant.canRead || participant.userId === authorId) {
          return false;
        }

        if (visibility === ChatMessageVisibility.PRIVADA_USUARIOS) {
          return privateRecipients.has(participant.userId);
        }

        return this.canViewVisibility(
          participant.user.role,
          visibility,
          true,
          false,
        );
      })
      .map((participant) => participant.userId);
  }

  private async getChatOrThrow(tx: PrismaClientLike, chatId: string) {
    const chat = await tx.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat não encontrado.');
    }

    return chat;
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  private async getEntityContext(
    tx: PrismaClientLike,
    user: AuthUser,
    entityType: ChatEntityType,
    entityId: string,
    title?: string | null,
  ): Promise<EntityContext> {
    if (entityType === ChatEntityType.TICKET) {
      const ticket = await tx.ticket.findUnique({
        where: { id: entityId },
        include: {
          client: { include: { user: true } },
        },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket não encontrado.');
      }

      if (
        user.role === UserRole.CLIENTE &&
        (ticket.internalOnly || ticket.client?.userId !== user.sub)
      ) {
        throw new NotFoundException('Ticket não encontrado.');
      }

      if (user.role !== UserRole.CLIENTE && !this.isInternalRole(user.role)) {
        throw new ForbiddenException(
          'Você não tem permissão para acessar este ticket.',
        );
      }

      return {
        entityType,
        entityId,
        ticketId: ticket.id,
        clientId: ticket.clientId,
        leadId: ticket.leadId,
        quoteId: ticket.quoteId,
        title: title ?? ticket.subject,
        internalOnly: ticket.internalOnly,
        defaultParticipants: this.uniqueParticipants(
          [
            { userId: user.sub },
            ticket.requesterId ? { userId: ticket.requesterId } : null,
            ticket.assignedToId ? { userId: ticket.assignedToId } : null,
            !ticket.internalOnly && ticket.client?.userId
              ? { userId: ticket.client.userId }
              : null,
          ].filter(Boolean) as ParticipantInput[],
        ),
      };
    }

    if (entityType === ChatEntityType.CLIENTE) {
      const client = await tx.client.findUnique({
        where: { id: entityId },
        include: { user: true },
      });

      if (!client) {
        throw new NotFoundException('Cliente não encontrado.');
      }

      if (user.role === UserRole.CLIENTE && client.userId !== user.sub) {
        throw new NotFoundException('Cliente não encontrado.');
      }

      if (user.role !== UserRole.CLIENTE && !this.isInternalRole(user.role)) {
        throw new ForbiddenException(
          'Você não tem permissão para acessar este cliente.',
        );
      }

      return {
        entityType,
        entityId,
        clientId: client.id,
        title: title ?? client.companyName ?? client.user.name,
        defaultParticipants: this.uniqueParticipants(
          [
            { userId: user.sub },
            { userId: client.userId },
            client.internalOwnerId ? { userId: client.internalOwnerId } : null,
          ].filter(Boolean) as ParticipantInput[],
        ),
      };
    }

    if (entityType === ChatEntityType.COTACAO) {
      const quote = await tx.quote.findUnique({
        where: { id: entityId },
        include: { client: { include: { user: true } }, prospect: true },
      });

      if (!quote) {
        throw new NotFoundException('Cotação não encontrada.');
      }

      if (
        user.role === UserRole.CLIENTE &&
        (!quote.client?.userId || quote.client.userId !== user.sub)
      ) {
        throw new NotFoundException('Cotação não encontrada.');
      }

      if (user.role !== UserRole.CLIENTE && !this.isInternalRole(user.role)) {
        throw new ForbiddenException(
          'Você não tem permissão para acessar esta cotação.',
        );
      }

      return {
        entityType,
        entityId,
        quoteId: quote.id,
        clientId: quote.clientId,
        title: title ?? quote.code,
        defaultParticipants: this.uniqueParticipants(
          [
            { userId: user.sub },
            quote.client?.userId ? { userId: quote.client.userId } : null,
          ].filter(Boolean) as ParticipantInput[],
        ),
      };
    }

    if (entityType === ChatEntityType.PROPOSTA) {
      const proposta = await tx.proposta.findUnique({
        where: { id: entityId },
        include: { client: { include: { user: true } } },
      });

      if (!proposta) {
        throw new NotFoundException('Proposta não encontrada.');
      }

      if (
        user.role === UserRole.CLIENTE &&
        (!proposta.client?.userId || proposta.client.userId !== user.sub)
      ) {
        throw new NotFoundException('Proposta não encontrada.');
      }

      if (user.role !== UserRole.CLIENTE && !this.isInternalRole(user.role)) {
        throw new ForbiddenException(
          'Você não tem permissão para acessar esta proposta.',
        );
      }

      return {
        entityType,
        entityId,
        propostaId: proposta.id,
        ticketId: proposta.ticketId,
        quoteId: proposta.quoteId,
        clientId: proposta.clientId,
        title: title ?? proposta.code,
        defaultParticipants: this.uniqueParticipants(
          [
            { userId: user.sub },
            proposta.client?.userId ? { userId: proposta.client.userId } : null,
            proposta.criadaPorId ? { userId: proposta.criadaPorId } : null,
            proposta.enviadaPorId ? { userId: proposta.enviadaPorId } : null,
          ].filter(Boolean) as ParticipantInput[],
        ),
      };
    }

    const lead = await tx.lead.findUnique({
      where: { id: entityId },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado.');
    }

    if (!this.isInternalRole(user.role)) {
      throw new ForbiddenException('Leads são restritos a usuários internos.');
    }

    return {
      entityType,
      entityId,
      leadId: lead.id,
      title: title ?? lead.company ?? lead.name,
      internalOnly: true,
      defaultParticipants: [{ userId: user.sub }],
    };
  }

  async create(user: AuthUser, dto: CreateChatDto) {
    let result: { chat: ChatWithParticipants; created: boolean };

    try {
      result = await this.prisma.$transaction(async (tx) => {
      const context = await this.getEntityContext(
        tx,
        user,
        dto.entityType,
        dto.entityId,
        dto.title,
      );
      const participants = this.uniqueParticipants([
        ...context.defaultParticipants,
        ...(dto.participants ?? []),
      ]);

      await this.validateParticipantsExist(tx, participants);

      const existing = await tx.chat.findUnique({
  where: {
    entityType_entityId: {
      entityType: context.entityType,
      entityId: context.entityId,
    },
  },
  include: {
    participants: {
      include: {
        user: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    },
  },
});

      if (existing) {
        await this.upsertChatParticipants(tx, existing.id, participants);
        const updated = await this.getChatOrThrow(tx, existing.id);

        this.assertParticipant(user, updated);
        return { chat: updated, created: false };
      }

      const chat = await tx.chat.create({
        data: {
          entityType: context.entityType,
          entityId: context.entityId,
          title: context.title,
          leadId: context.leadId,
          clientId: context.clientId,
          quoteId: context.quoteId,
          propostaId: context.propostaId,
          ticketId: context.ticketId,
          createdById: user.sub,
          participants: {
            create: participants.map((participant) => ({
              userId: participant.userId,
              canRead: participant.canRead ?? true,
              canWrite: participant.canWrite ?? true,
            })),
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      return { chat, created: true };
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      result = await this.prisma.$transaction(async (tx) => {
        const context = await this.getEntityContext(
          tx,
          user,
          dto.entityType,
          dto.entityId,
          dto.title,
        );
        const participants = this.uniqueParticipants([
          ...context.defaultParticipants,
          ...(dto.participants ?? []),
        ]);

        await this.validateParticipantsExist(tx, participants);

        const existing = await tx.chat.findUnique({
          where: {
            entityType_entityId: {
              entityType: context.entityType,
              entityId: context.entityId,
            },
          },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    role: true,
                  },
                },
              },
            },
          },
        });

        if (!existing) {
          throw error;
        }

        await this.upsertChatParticipants(tx, existing.id, participants);
        const updated = await this.getChatOrThrow(tx, existing.id);

        this.assertParticipant(user, updated);
        return { chat: updated, created: false };
      });
    }

    if (result.created) {
      await this.auditLogsService.create({
        category: AuditLogCategory.CHAT,
        action: AuditLogAction.CHAT_CREATED,
        message: `Chat criado para ${result.chat.entityType}:${result.chat.entityId}.`,
        targetType: 'Chat',
        targetId: result.chat.id,
        userId: user.sub,
        details: {
          entityType: result.chat.entityType,
          entityId: result.chat.entityId,
          participantIds: result.chat.participants.map(
            (participant) => participant.userId,
          ),
        },
      });
    }

    return result.chat;
  }

  private async countUnreadMessagesForUser(
    user: AuthUser,
    chatId: string,
    lastReadAt?: Date | null,
  ) {
    return this.prisma.chatMessage.count({
      where: {
        AND: [
          this.buildMessageWhereForUser(user, chatId),
          {
            authorId: {
              not: user.sub,
            },
          },
          ...(lastReadAt
            ? [
                {
                  createdAt: {
                    gt: lastReadAt,
                  },
                },
              ]
            : []),
        ],
      },
    });
  }

  async findAll(user: AuthUser) {
    const chats = await this.prisma.chat.findMany({
      where:
        user.role === UserRole.ADMIN
          ? {}
          : {
              participants: {
                some: {
                  userId: user.sub,
                  canRead: true,
                },
              },
            },
      include: {
        participants: {
          where: {
            canRead: true,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        client: {
          select: {
            id: true,
            companyName: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        lead: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
        quote: {
          select: {
            id: true,
            code: true,
            serviceType: true,
          },
        },
        proposta: {
          select: {
            id: true,
            code: true,
            titulo: true,
            status: true,
          },
        },
        ticket: {
          select: {
            id: true,
            subject: true,
            status: true,
            internalOnly: this.isInternalRole(user.role),
          },
        },
        messages: {
          where: this.buildMessageWhereForUser(user, undefined),
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return Promise.all(
      chats.map(async (chat) => {
        const participant = chat.participants.find(
          (item) => item.userId === user.sub && item.canRead,
        );
        const unreadCount = participant
          ? await this.countUnreadMessagesForUser(
              user,
              chat.id,
              participant.lastReadAt,
            )
          : 0;

        return {
          ...chat,
          lastReadAt: participant?.lastReadAt ?? null,
          unreadCount,
        };
      }),
    );
  }

  async ensureTicketChat(
    tx: Prisma.TransactionClient,
    input: {
      ticketId: string;
      subject: string;
      actorId: string;
      requesterId?: string | null;
      assignedToId?: string | null;
      clientId?: string | null;
      clientUserId?: string | null;
      leadId?: string | null;
      quoteId?: string | null;
      internalOnly?: boolean | null;
      participantUserIds?: Array<string | null | undefined>;
    },
  ) {
    const existing = await tx.chat.findUnique({
      where: {
        entityType_entityId: {
          entityType: ChatEntityType.TICKET,
          entityId: input.ticketId,
        },
      },
    });

    const participantIds = new Set(
      [
        input.actorId,
        input.requesterId,
        input.assignedToId,
        ...(input.participantUserIds ?? []),
        input.internalOnly ? null : input.clientUserId,
      ].filter((id): id is string => Boolean(id)),
    );

    if (existing) {
      for (const userId of participantIds) {
        await tx.chatParticipant.upsert({
          where: {
            chatId_userId: {
              chatId: existing.id,
              userId,
            },
          },
          update: {
            canRead: true,
            canWrite: true,
          },
          create: {
            chatId: existing.id,
            userId,
            canRead: true,
            canWrite: true,
          },
        });
      }

      return existing;
    }

    return tx.chat.create({
      data: {
        entityType: ChatEntityType.TICKET,
        entityId: input.ticketId,
        title: input.subject,
        ticketId: input.ticketId,
        clientId: input.clientId ?? null,
        leadId: input.leadId ?? null,
        quoteId: input.quoteId ?? null,
        createdById: input.actorId,
        participants: {
          create: Array.from(participantIds).map((userId) => ({
            userId,
            canRead: true,
            canWrite: true,
          })),
        },
      },
    });
  }

  async ensurePropostaChat(
    tx: Prisma.TransactionClient,
    input: {
      propostaId: string;
      code: string;
      ticketId: string;
      actorId: string;
      clientId?: string | null;
      clientUserId?: string | null;
      quoteId?: string | null;
      criadaPorId?: string | null;
      enviadaPorId?: string | null;
      assignedToId?: string | null;
      requesterId?: string | null;
    },
  ) {
    const existing = await tx.chat.findUnique({
      where: {
        entityType_entityId: {
          entityType: ChatEntityType.PROPOSTA,
          entityId: input.propostaId,
        },
      },
    });
    const participantIds = new Set(
      [
        input.actorId,
        input.clientUserId,
        input.criadaPorId,
        input.enviadaPorId,
        input.assignedToId,
        input.requesterId,
      ].filter((id): id is string => Boolean(id)),
    );

    if (existing) {
      for (const userId of participantIds) {
        await tx.chatParticipant.upsert({
          where: {
            chatId_userId: {
              chatId: existing.id,
              userId,
            },
          },
          update: {
            canRead: true,
            canWrite: true,
          },
          create: {
            chatId: existing.id,
            userId,
            canRead: true,
            canWrite: true,
          },
        });
      }

      return existing;
    }

    return tx.chat.create({
      data: {
        entityType: ChatEntityType.PROPOSTA,
        entityId: input.propostaId,
        title: input.code,
        propostaId: input.propostaId,
        ticketId: input.ticketId,
        clientId: input.clientId ?? null,
        quoteId: input.quoteId ?? null,
        createdById: input.actorId,
        participants: {
          create: Array.from(participantIds).map((userId) => ({
            userId,
            canRead: true,
            canWrite: true,
          })),
        },
      },
    });
  }

  private buildMessageWhereForUser(
    user: AuthUser,
    chatId?: string,
  ): Prisma.ChatMessageWhereInput {
    return {
      ...(chatId ? { chatId } : {}),
      deletedAt: null,
      OR: [
        { visibility: ChatMessageVisibility.PUBLICA_CLIENTE },
        ...(this.isInternalRole(user.role)
          ? [{ visibility: ChatMessageVisibility.INTERNA }]
          : []),
        ...(this.isGestaoComercialRole(user.role)
          ? [{ visibility: ChatMessageVisibility.GESTAO_COMERCIAL }]
          : []),
        {
          visibility: ChatMessageVisibility.PRIVADA_USUARIOS,
          recipients: {
            some: {
              userId: user.sub,
            },
          },
        },
      ],
    };
  }

  async findMessages(user: AuthUser, chatId: string) {
    const chat = await this.getChatOrThrow(this.prisma, chatId);
    this.assertParticipant(user, chat);

    const messages = await this.prisma.chatMessage.findMany({
      where: this.buildMessageWhereForUser(user, chatId),
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: this.isInternalRole(user.role),
            role: true,
          },
        },
        recipients: this.isInternalRole(user.role)
          ? {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
            }
          : false,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    await this.markRead(user, chatId);

    return messages;
  }

  async markRead(user: AuthUser, chatId: string) {
    const chat = await this.getChatOrThrow(this.prisma, chatId);
    this.assertParticipant(user, chat);
    const lastReadAt = new Date();

    const client = this.prisma as PrismaService & {
      chatParticipant?: {
        updateMany?: (
          args: Prisma.ChatParticipantUpdateManyArgs,
        ) => Promise<unknown>;
      };
    };

    if (client.chatParticipant?.updateMany) {
      await client.chatParticipant.updateMany({
        where: {
          chatId,
          userId: user.sub,
          canRead: true,
        },
        data: {
          lastReadAt,
        },
      });
    }

    return {
      chatId,
      lastReadAt,
    };
  }

  async createMessageInTransaction(
    tx: Prisma.TransactionClient,
    input: {
      chatId: string;
      authorId: string;
      content: string;
      visibility: ChatMessageVisibility;
      authorizedUserIds?: string[];
    },
  ) {
    const authorizedUserIds = Array.from(
      new Set([input.authorId, ...(input.authorizedUserIds ?? [])]),
    );

    const message = await tx.chatMessage.create({
      data: {
        chatId: input.chatId,
        authorId: input.authorId,
        content: this.sanitizePlainText(input.content) ?? '',
        visibility: input.visibility,
        recipients:
          input.visibility === ChatMessageVisibility.PRIVADA_USUARIOS
            ? {
                create: authorizedUserIds.map((userId) => ({
                  userId,
                })),
              }
            : undefined,
      },
    });

    await this.touchChatAfterMessage(
      tx,
      input.chatId,
      input.authorId,
      message.createdAt,
    );

    return message;
  }

  async sendMessage(user: AuthUser, chatId: string, dto: SendChatMessageDto) {
    const content = this.sanitizePlainText(dto.content);
    const visibility = dto.visibility ?? ChatMessageVisibility.PUBLICA_CLIENTE;

    if (!content) {
      throw new BadRequestException('Informe a mensagem.');
    }

    this.assertCanUseVisibility(user, visibility, dto.authorizedUserIds);

    const result = await this.prisma.$transaction(async (tx) => {
      const chat = await this.getChatOrThrow(tx, chatId);
      this.assertParticipant(user, chat, true);

      if (visibility === ChatMessageVisibility.PRIVADA_USUARIOS) {
        const participantIds = new Set(
          chat.participants
            .filter((participant) => participant.canRead)
            .map((participant) => participant.userId),
        );
        const unauthorized = (dto.authorizedUserIds ?? []).some(
          (userId) => !participantIds.has(userId),
        );

        if (unauthorized) {
          throw new ForbiddenException(
            'Mensagem privada contém usuário fora do chat.',
          );
        }
      }

      const createdMessage = await tx.chatMessage.create({
        data: {
          chatId,
          authorId: user.sub,
          content,
          visibility,
          recipients:
            visibility === ChatMessageVisibility.PRIVADA_USUARIOS
              ? {
                  create: Array.from(
                    new Set([user.sub, ...(dto.authorizedUserIds ?? [])]),
                  ).map((userId) => ({ userId })),
                }
              : undefined,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          recipients: true,
        },
      });

      await this.touchChatAfterMessage(
        tx,
        chatId,
        user.sub,
        createdMessage.createdAt,
      );

      return {
        message: createdMessage,
        recipientIds: this.getMessageNotificationRecipients(
          chat,
          user.sub,
          visibility,
          dto.authorizedUserIds,
        ),
        chatTitle: chat.title,
        ticketId: chat.ticketId,
      };
    });

    const message = result.message;

    if (result.recipientIds.length > 0) {
      await this.notificationsService.notifyUsers(result.recipientIds, {
        ticketId: result.ticketId ?? null,
        title: 'Nova mensagem no chat',
        message: `${user.email} enviou uma nova mensagem${result.chatTitle ? ` em ${result.chatTitle}` : ''}.`,
        link: `/chat?chat=${chatId}`,
        actorId: user.sub,
        metadata: {
          type: 'CHAT_MESSAGE',
          chatId,
          visibility,
          messageId: message.id,
        },
      });
    }

    await this.auditLogsService.create({
      category: AuditLogCategory.CHAT,
      action: AuditLogAction.CHAT_MESSAGE_SENT,
      message: 'Mensagem enviada no chat.',
      targetType: 'ChatMessage',
      targetId: message.id,
      userId: user.sub,
      details: {
        chatId,
        visibility: message.visibility,
      },
    });

    return message;
  }

  async updateMessage(
    user: AuthUser,
    chatId: string,
    messageId: string,
    dto: UpdateChatMessageDto,
  ) {
    if (dto.visibility) {
      this.assertCanUseVisibility(user, dto.visibility, dto.authorizedUserIds);
    }

    const sanitizedContent =
      dto.content !== undefined
        ? this.sanitizePlainText(dto.content)
        : undefined;

    if (dto.content !== undefined && !sanitizedContent) {
      throw new BadRequestException('Informe a mensagem.');
    }

    const content = sanitizedContent === null ? undefined : sanitizedContent;

    const result = await this.prisma.$transaction(async (tx) => {
      const chat = await this.getChatOrThrow(tx, chatId);
      this.assertParticipant(user, chat, true);

      const message = await tx.chatMessage.findFirst({
        where: {
          id: messageId,
          chatId,
          deletedAt: null,
        },
      });

      if (!message) {
        throw new NotFoundException('Mensagem não encontrada.');
      }

      if (message.authorId !== user.sub && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'Você não tem permissão para editar esta mensagem.',
        );
      }

      const nextVisibility = dto.visibility ?? message.visibility;
      const shouldReplaceRecipients =
        dto.visibility !== undefined || dto.authorizedUserIds !== undefined;

      if (
        shouldReplaceRecipients &&
        nextVisibility === ChatMessageVisibility.PRIVADA_USUARIOS
      ) {
        const participantIds = new Set(
          chat.participants
            .filter((participant) => participant.canRead)
            .map((participant) => participant.userId),
        );
        const unauthorized = (dto.authorizedUserIds ?? []).some(
          (userId) => !participantIds.has(userId),
        );

        if (unauthorized) {
          throw new ForbiddenException(
            'Mensagem privada contém usuário fora do chat.',
          );
        }
      }

      if (shouldReplaceRecipients) {
        await tx.chatMessageRecipient.deleteMany({
          where: {
            messageId,
          },
        });
      }

      return tx.chatMessage.update({
        where: { id: messageId },
        data: {
          ...(content !== undefined ? { content } : {}),
          ...(dto.visibility ? { visibility: dto.visibility } : {}),
          editedAt: new Date(),
          recipients:
            shouldReplaceRecipients &&
            nextVisibility === ChatMessageVisibility.PRIVADA_USUARIOS
              ? {
                  create: Array.from(
                    new Set([user.sub, ...(dto.authorizedUserIds ?? [])]),
                  ).map((userId) => ({ userId })),
                }
              : undefined,
        },
      });
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.CHAT,
      action: dto.visibility
        ? AuditLogAction.CHAT_MESSAGE_VISIBILITY_CHANGED
        : AuditLogAction.CHAT_MESSAGE_UPDATED,
      message: dto.visibility
        ? 'Visibilidade da mensagem alterada.'
        : 'Mensagem editada no chat.',
      targetType: 'ChatMessage',
      targetId: messageId,
      userId: user.sub,
      details: {
        chatId,
        visibility: result.visibility,
      },
    });

    return result;
  }

  async deleteMessage(user: AuthUser, chatId: string, messageId: string) {
    await this.prisma.$transaction(async (tx) => {
      const chat = await this.getChatOrThrow(tx, chatId);
      this.assertParticipant(user, chat, true);

      const message = await tx.chatMessage.findFirst({
        where: {
          id: messageId,
          chatId,
          deletedAt: null,
        },
      });

      if (!message) {
        throw new NotFoundException('Mensagem não encontrada.');
      }

      if (message.authorId !== user.sub && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'Você não tem permissão para excluir esta mensagem.',
        );
      }

      await tx.chatMessage.update({
        where: { id: messageId },
        data: {
          deletedAt: new Date(),
        },
      });
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.CHAT,
      action: AuditLogAction.CHAT_MESSAGE_DELETED,
      message: 'Mensagem excluida do chat.',
      targetType: 'ChatMessage',
      targetId: messageId,
      userId: user.sub,
      details: {
        chatId,
      },
    });

    return { success: true };
  }

  async updateParticipants(
    user: AuthUser,
    chatId: string,
    dto: UpdateChatParticipantsDto,
  ) {
    const participants = this.uniqueParticipants([
      { userId: user.sub },
      ...dto.participants,
    ]);

    const chat = await this.prisma.$transaction(async (tx) => {
      const existing = await this.getChatOrThrow(tx, chatId);
      this.assertCanManageChat(user, existing);
      await this.validateParticipantsExist(tx, participants);

      await tx.chatParticipant.deleteMany({
        where: {
          chatId,
          userId: {
            notIn: participants.map((participant) => participant.userId),
          },
        },
      });

      for (const participant of participants) {
        await tx.chatParticipant.upsert({
          where: {
            chatId_userId: {
              chatId,
              userId: participant.userId,
            },
          },
          update: {
            canRead: participant.canRead ?? true,
            canWrite: participant.canWrite ?? true,
          },
          create: {
            chatId,
            userId: participant.userId,
            canRead: participant.canRead ?? true,
            canWrite: participant.canWrite ?? true,
          },
        });
      }

      return this.getChatOrThrow(tx, chatId);
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.CHAT,
      action: AuditLogAction.CHAT_PARTICIPANTS_CHANGED,
      message: 'Participantes do chat alterados.',
      targetType: 'Chat',
      targetId: chatId,
      userId: user.sub,
      details: {
        participantIds: chat.participants.map(
          (participant) => participant.userId,
        ),
      },
    });

    return chat;
  }
}
