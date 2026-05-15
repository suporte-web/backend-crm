import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditLogAction,
  AuditLogCategory,
  ChatMessageVisibility,
  MessageSenderType,
  OpportunityStage,
  OpportunityStatus,
  Prisma,
  QuoteStatus,
  StatusProposta,
  TicketHistoryEventType,
  TicketStatus,
  TicketType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ChatsService } from '../chats/chats.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import {
  ClientTicketDecisionDto,
  ManagementTicketDecisionDto,
  SendPreProposalDto,
  SendToManagementDto,
} from './dto/ticket-actions.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

type TicketFilters = {
  status?: string;
  type?: string;
  q?: string;
};

type TicketNotificationTarget = {
  id: string;
  subject: string;
  assignedToId?: string | null;
  internalOnly?: boolean | null;
  client?: {
    userId: string;
    companyName?: string | null;
    user?: {
      name: string;
      email: string;
    } | null;
  } | null;
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly chatsService: ChatsService,
  ) {}

  private ensureInternalUser(user: { sub: string; role: string }) {
    const allowedRoles = ['ADMIN', 'GESTAO', 'COMERCIAL'];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este recurso.',
      );
    }
  }

  private isInternalUser(user: { role: string }) {
    return ['ADMIN', 'GESTAO', 'COMERCIAL'].includes(user.role);
  }

  private sanitize(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private toPositiveDecimal(
    value: number | Prisma.Decimal | null | undefined,
  ) {
    if (value === undefined || value === null) {
      return null;
    }

    const decimal = new Prisma.Decimal(value);

    return decimal.gt(0) ? decimal : null;
  }

  private assertPositiveProposalValue(
    value: number | Prisma.Decimal | null | undefined,
  ) {
    const decimal = this.toPositiveDecimal(value);

    if (!decimal) {
      throw new BadRequestException(
        'Informe um valor maior que zero para a proposta.',
      );
    }

    return decimal;
  }

  private generateDisplayCode(prefix: 'PROP', source: string) {
    let hash = 0;

    for (const char of source) {
      hash = (hash * 31 + char.charCodeAt(0)) % 1000000;
    }

    return `${prefix}-${String(hash).padStart(6, '0')}`;
  }

  private isInternalDirectedTicket(user: AuthUser, dto: CreateTicketDto) {
    if (!this.isInternalUser(user)) {
      return false;
    }

    if (dto.isInternal !== undefined) {
      return dto.isInternal;
    }

    return Boolean(
      dto.leadId || dto.assignedToId || dto.type === TicketType.LEAD,
    );
  }

  private getActionRole(status: TicketStatus): UserRole | null {
    const newStatuses: TicketStatus[] = [
      TicketStatus.NEW,
      TicketStatus.NOVO,
      TicketStatus.ABERTO,
    ];
    const clientActionStatuses: TicketStatus[] = [
      TicketStatus.AGUARDANDO_CLIENTE,
      TicketStatus.RESPONDIDO,
    ];
    const commercialActionStatuses: TicketStatus[] = [
      TicketStatus.AGUARDANDO_COMERCIAL,
      TicketStatus.APROVADO_CLIENTE,
      TicketStatus.AJUSTE_SOLICITADO,
      TicketStatus.EM_ANDAMENTO,
      TicketStatus.IN_PROGRESS,
      TicketStatus.CONVERTIDO_EM_PROSPECT,
      TicketStatus.COTACAO_CRIADA,
      TicketStatus.TRANSFERIDO,
    ];

    if (newStatuses.includes(status)) {
      return UserRole.COMERCIAL;
    }

    if (clientActionStatuses.includes(status)) {
      return UserRole.CLIENTE;
    }

    if (commercialActionStatuses.includes(status)) {
      return UserRole.COMERCIAL;
    }

    if (status === TicketStatus.AGUARDANDO_GESTAO) {
      return UserRole.GESTAO;
    }

    return null;
  }

  private includeTicketRelations(user?: {
    role: string;
  }): Prisma.TicketInclude {
    const hideInternal = user?.role === 'CLIENTE';

    return {
      client: {
        include: {
          user: true,
        },
      },
      quote: true,
      prospect: true,
      lead: true,
      opportunity: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      propostas: {
        where: hideInternal
          ? {
              status: {
                not: StatusProposta.RASCUNHO,
              },
            }
          : undefined,
        orderBy: [
          {
            versao: 'desc',
          },
          {
            updatedAt: 'desc',
          },
        ],
      },
      messages: {
        where: hideInternal ? { isInternal: false } : undefined,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      history: {
        where: hideInternal ? { internalOnly: false } : undefined,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    };
  }

  private validateStatus(status?: string) {
    if (!status) {
      return undefined;
    }

    if (!Object.values(TicketStatus).includes(status as TicketStatus)) {
      throw new BadRequestException('Status do ticket invalido.');
    }

    return status as TicketStatus;
  }

  private validateType(type?: string) {
    if (!type) {
      return undefined;
    }

    if (!Object.values(TicketType).includes(type as TicketType)) {
      throw new BadRequestException('Tipo de ticket invalido.');
    }

    return type as TicketType;
  }

  private buildTextSearchWhere(query: string): Prisma.TicketWhereInput {
    return {
      OR: [
        { id: { contains: query, mode: 'insensitive' } },
        { subject: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        {
          client: {
            is: { companyName: { contains: query, mode: 'insensitive' } },
          },
        },
        {
          client: {
            is: { user: { name: { contains: query, mode: 'insensitive' } } },
          },
        },
        {
          client: {
            is: { user: { email: { contains: query, mode: 'insensitive' } } },
          },
        },
        {
          prospect: {
            is: {
              nomeRazaoSocial: { contains: query, mode: 'insensitive' },
            },
          },
        },
        {
          prospect: {
            is: { email: { contains: query, mode: 'insensitive' } },
          },
        },
        { quote: { is: { code: { contains: query, mode: 'insensitive' } } } },
        {
          quote: {
            is: { serviceType: { contains: query, mode: 'insensitive' } },
          },
        },
        {
          propostas: {
            some: { code: { contains: query, mode: 'insensitive' } },
          },
        },
        {
          propostas: {
            some: { titulo: { contains: query, mode: 'insensitive' } },
          },
        },
        { lead: { is: { name: { contains: query, mode: 'insensitive' } } } },
        { lead: { is: { email: { contains: query, mode: 'insensitive' } } } },
        { lead: { is: { company: { contains: query, mode: 'insensitive' } } } },
        {
          opportunity: {
            is: { title: { contains: query, mode: 'insensitive' } },
          },
        },
      ],
    };
  }

  private buildWhereForUser(
    user: { sub: string; role: string },
    filters: TicketFilters,
  ): Prisma.TicketWhereInput {
    const status = this.validateStatus(filters.status);
    const type = this.validateType(filters.type);
    const and: Prisma.TicketWhereInput[] = [];

    if (status) {
      and.push({ status });
    }

    if (type) {
      and.push({ type });
    }

    if (filters.q?.trim()) {
      and.push(this.buildTextSearchWhere(filters.q.trim()));
    }

    if (user.role === 'CLIENTE') {
      and.push({
        internalOnly: false,
        client: {
          is: {
            userId: user.sub,
          },
        },
      });
    } else if (user.role === 'COMERCIAL') {
      and.push({
        OR: [
          { assignedToId: user.sub },
          { assignedToId: null },
          { requiresActionRole: UserRole.COMERCIAL },
          {
            status: {
              in: [
                TicketStatus.ABERTO,
                TicketStatus.NOVO,
                TicketStatus.NEW,
                TicketStatus.EM_ANDAMENTO,
                TicketStatus.AGUARDANDO_COMERCIAL,
                TicketStatus.RESPONDIDO,
                TicketStatus.APROVADO_CLIENTE,
                TicketStatus.AJUSTE_SOLICITADO,
                TicketStatus.CONVERTIDO_EM_PROSPECT,
                TicketStatus.COTACAO_CRIADA,
                TicketStatus.TRANSFERIDO,
              ],
            },
          },
          {
            client: {
              is: {
                internalOwnerId: user.sub,
              },
            },
          },
        ],
      });
    } else if (user.role === 'GESTAO') {
      and.push({
        OR: [
          { assignedToId: user.sub },
          { requesterId: user.sub },
          { requiresActionRole: UserRole.GESTAO },
          { status: TicketStatus.AGUARDANDO_GESTAO },
          { type: TicketType.APROVACAO_GESTAO },
        ],
      });
    } else if (user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Você não tem permissão para acessar tickets.',
      );
    }

    return and.length > 0 ? { AND: and } : {};
  }

  private assertTicketAccess(
    user: { sub: string; role: string },
    ticket: {
      client?: { userId: string } | null;
      internalOnly?: boolean | null;
    },
  ) {
    if (
      user.role === 'CLIENTE' &&
      (ticket.internalOnly || ticket.client?.userId !== user.sub)
    ) {
      throw new NotFoundException('Ticket não encontrado.');
    }

    if (!this.isInternalUser(user) && user.role !== 'CLIENTE') {
      throw new ForbiddenException(
        'Você não tem permissão para acessar tickets.',
      );
    }
  }

  private async getCommercialRecipientIds(
    ticket: TicketNotificationTarget,
    tx: Prisma.TransactionClient,
  ) {
    if (ticket.assignedToId) {
      return [ticket.assignedToId];
    }

    return this.notificationsService.getUserIdsByRoles(
      [UserRole.COMERCIAL, UserRole.ADMIN],
      tx,
    );
  }

  private getClientRecipientIds(ticket: TicketNotificationTarget) {
    return ticket.client?.userId ? [ticket.client.userId] : [];
  }

  private getClientName(ticket: TicketNotificationTarget) {
    return ticket.client?.companyName || ticket.client?.user?.name || 'Cliente';
  }

  private async notifyClient(
    tx: Prisma.TransactionClient,
    ticket: TicketNotificationTarget,
    actorId: string | null,
    title: string,
    message: string,
  ) {
    return this.notificationsService.notifyUsers(
      this.getClientRecipientIds(ticket),
      {
        ticketId: ticket.id,
        title,
        message,
        actorId,
        emailSubject: title,
        emailSummary: `${this.getClientName(ticket)} - ${message}`,
      },
      tx,
    );
  }

  private async notifyCommercial(
    tx: Prisma.TransactionClient,
    ticket: TicketNotificationTarget,
    actorId: string | null,
    title: string,
    message: string,
  ) {
    return this.notificationsService.notifyUsers(
      await this.getCommercialRecipientIds(ticket, tx),
      {
        ticketId: ticket.id,
        title,
        message,
        actorId,
        emailSubject: title,
        emailSummary: `${this.getClientName(ticket)} - ${message}`,
      },
      tx,
    );
  }

  private async notifyManagement(
    tx: Prisma.TransactionClient,
    ticket: TicketNotificationTarget,
    actorId: string | null,
    title: string,
    message: string,
  ) {
    return this.notificationsService.notifyRoles(
      [UserRole.GESTAO, UserRole.ADMIN],
      {
        ticketId: ticket.id,
        title,
        message,
        actorId,
        emailSubject: title,
        emailSummary: `${this.getClientName(ticket)} - ${message}`,
      },
      tx,
    );
  }

  private async notifyByStatus(
    tx: Prisma.TransactionClient,
    ticket: TicketNotificationTarget,
    actorId: string | null,
    status: TicketStatus,
  ) {
    const clientStatuses: TicketStatus[] = [
      TicketStatus.AGUARDANDO_CLIENTE,
      TicketStatus.RESPONDIDO,
    ];
    const commercialStatuses: TicketStatus[] = [
      TicketStatus.AGUARDANDO_COMERCIAL,
      TicketStatus.APROVADO_CLIENTE,
      TicketStatus.AJUSTE_SOLICITADO,
    ];

    if (!ticket.internalOnly && clientStatuses.includes(status)) {
      await this.notifyClient(
        tx,
        ticket,
        actorId,
        'Sua solicitação foi respondida',
        'Nossa equipe respondeu sua solicitação. Acesse o ticket para visualizar a devolutiva.',
      );
    }

    if (commercialStatuses.includes(status)) {
      await this.notifyCommercial(
        tx,
        ticket,
        actorId,
        'Ticket aguardando ação comercial',
        'O ticket foi atualizado e exige ação do Comercial.',
      );
    }

    if (status === TicketStatus.AGUARDANDO_GESTAO) {
      await this.notifyManagement(
        tx,
        ticket,
        actorId,
        'Negociacao aguardando aprovação da Gestão',
        'Uma negociacao foi enviada para aprovação da Gestão.',
      );
    }
  }

  private async loadLinkedData(user: AuthUser, dto: CreateTicketDto) {
    let client = dto.clientId
      ? await this.prisma.client.findUnique({
          where: { id: dto.clientId },
          include: { user: true },
        })
      : null;

    if (user.role === 'CLIENTE') {
      client = await this.prisma.client.findUnique({
        where: { userId: user.sub },
        include: { user: true },
      });
    }

    const quote = dto.quoteId
      ? await this.prisma.quote.findUnique({
          where: { id: dto.quoteId },
          include: {
            client: {
              include: {
                user: true,
              },
            },
          },
        })
      : null;

    if (dto.quoteId && !quote) {
      throw new BadRequestException('Cotação invalida para este ticket.');
    }

    if (quote) {
      if (client && quote.clientId !== client.id) {
        throw new BadRequestException(
          'Cotação não pertence ao cliente informado.',
        );
      }
      client = quote.client;
    }

    const opportunity = dto.opportunityId
      ? await this.prisma.opportunity.findUnique({
          where: { id: dto.opportunityId },
          include: {
            client: {
              include: {
                user: true,
              },
            },
          },
        })
      : null;

    if (dto.opportunityId && !opportunity) {
      throw new BadRequestException('Oportunidade invalida para este ticket.');
    }

    if (opportunity) {
      if (client && opportunity.clientId !== client.id) {
        throw new BadRequestException(
          'Oportunidade não pertence ao cliente informado.',
        );
      }
      client = opportunity.client;
    }

    const lead = dto.leadId
      ? await this.prisma.lead.findUnique({
          where: { id: dto.leadId },
        })
      : null;

    if (dto.leadId && !lead) {
      throw new BadRequestException('Lead invalido para este ticket.');
    }

    if (!client && !lead) {
      throw new BadRequestException(
        'Informe um cliente, cotação, oportunidade ou lead.',
      );
    }

    return {
      client,
      quote,
      opportunity,
      lead,
    };
  }

  async create(user: AuthUser, dto: CreateTicketDto) {
    const subject = this.sanitize(dto.subject);
    const description = this.sanitize(dto.description);

    if (!subject || !description) {
      throw new BadRequestException('Informe assunto e descrição do ticket.');
    }

    if (
      this.isInternalUser(user) &&
      !dto.clientId &&
      !dto.leadId &&
      !dto.quoteId &&
      !dto.opportunityId
    ) {
      throw new BadRequestException(
        'Informe um cliente, cotação, oportunidade ou lead.',
      );
    }

    const { client, quote, opportunity, lead } = await this.loadLinkedData(
      user,
      dto,
    );
    const createdByClient = user.role === 'CLIENTE';
    const internalOnly = this.isInternalDirectedTicket(user, dto);
    const initialStatus = createdByClient
      ? TicketStatus.AGUARDANDO_COMERCIAL
      : internalOnly
        ? TicketStatus.AGUARDANDO_COMERCIAL
        : TicketStatus.ABERTO;

    const ticket = await this.prisma.$transaction(async (tx) => {
      const createdTicket = await tx.ticket.create({
        data: {
          clientId: client?.id ?? null,
          quoteId: quote?.id ?? dto.quoteId ?? null,
          leadId: lead?.id ?? dto.leadId ?? null,
          opportunityId: opportunity?.id ?? dto.opportunityId ?? null,
          assignedToId: dto.assignedToId ?? null,
          requesterId: user.sub,
          type:
            dto.type ??
            (quote
              ? TicketType.COTACAO
              : lead
                ? TicketType.LEAD
                : TicketType.SUPORTE),
          subject,
          description,
          status: initialStatus,
          requiresActionRole: this.getActionRole(initialStatus),
          internalOnly,
          lastInteractionAt: new Date(),
          messages: {
            create: {
              senderType: createdByClient
                ? MessageSenderType.CLIENTE
                : MessageSenderType.INTERNO,
              message: description,
              isInternal: internalOnly,
              createdById: user.sub,
            },
          },
          history: {
            create: {
              eventType: TicketHistoryEventType.CREATED,
              title: 'Ticket criado',
              description: createdByClient
                ? 'Demanda criada pelo cliente.'
                : internalOnly
                  ? 'Demanda interna registrada pela equipe interna.'
                  : 'Demanda registrada pela equipe interna.',
              internalOnly,
              createdById: user.sub,
            },
          },
        },
        include: this.includeTicketRelations(user),
      });

      const chatParticipantIds = internalOnly
        ? await this.getCommercialRecipientIds(createdTicket, tx)
        : [];
      const chat = await this.chatsService.ensureTicketChat(tx, {
        ticketId: createdTicket.id,
        subject: createdTicket.subject,
        actorId: user.sub,
        requesterId: createdTicket.requesterId,
        assignedToId: createdTicket.assignedToId,
        clientId: createdTicket.clientId,
        clientUserId: createdTicket.client?.userId,
        leadId: createdTicket.leadId,
        quoteId: createdTicket.quoteId,
        internalOnly: createdTicket.internalOnly,
        participantUserIds: chatParticipantIds,
      });

      await this.chatsService.createMessageInTransaction(tx, {
        chatId: chat.id,
        authorId: user.sub,
        content: description,
        visibility: internalOnly
          ? ChatMessageVisibility.GESTAO_COMERCIAL
          : ChatMessageVisibility.PUBLICA_CLIENTE,
      });

      if (createdByClient) {
        await this.notifyCommercial(
          tx,
          createdTicket,
          user.sub,
          'Nova demanda recebida',
          'Nova demanda de cliente recebida. Acesse o ticket para iniciar o atendimento.',
        );
      } else if (internalOnly) {
        await this.notifyCommercial(
          tx,
          createdTicket,
          user.sub,
          lead
            ? 'Novo lead direcionado ao Comercial'
            : 'Ticket interno direcionado ao Comercial',
          lead
            ? 'A Gestão direcionou um lead para atendimento comercial.'
            : 'A Gestão abriu um ticket interno para acompanhamento comercial.',
        );
      } else if (createdTicket.client?.userId) {
        await this.notifyClient(
          tx,
          createdTicket,
          user.sub,
          'Ticket aberto no CRM',
          'Uma solicitação foi registrada para acompanhamento pelo portal.',
        );
      }

      return createdTicket;
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.TICKET,
      action: AuditLogAction.TICKET_CREATED,
      message: `Ticket criado: ${ticket.subject}.`,
      targetType: 'Ticket',
      targetId: ticket.id,
      userId: user.sub,
      details: {
        clientId: ticket.clientId ?? null,
        quoteId: ticket.quoteId ?? null,
        leadId: ticket.leadId ?? null,
        opportunityId: ticket.opportunityId ?? null,
        type: ticket.type,
        status: ticket.status,
        internalOnly: ticket.internalOnly,
      },
    });

    return this.findOne(user, ticket.id);
  }

  async findMine(userId: string, filters: TicketFilters = {}) {
    return this.findAll({ sub: userId, role: 'CLIENTE' }, filters);
  }

  async findAll(user: { sub: string; role: string }, filters: TicketFilters) {
    const where = this.buildWhereForUser(user, filters);

    return this.prisma.ticket.findMany({
      where,
      include: this.includeTicketRelations(user),
      orderBy: [
        {
          lastInteractionAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async findOne(user: { sub: string; role: string }, id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: this.includeTicketRelations(user),
    });

    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado.');
    }

    this.assertTicketAccess(user, ticket);
    await this.notificationsService.markTicketNotificationsRead(user.sub, id);

    return ticket;
  }

  async start(user: AuthUser, id: string) {
    this.ensureInternalUser(user);
    const ticket = await this.findOne(user, id);

    const closedStatuses: TicketStatus[] = [
      TicketStatus.FECHADO,
      TicketStatus.CANCELADO,
      TicketStatus.REPROVADO,
    ];

    if (closedStatuses.includes(ticket.status)) {
      throw new BadRequestException('Ticket encerrado não pode ser iniciado.');
    }

    const updatedTicket = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id },
        data: {
          assignedToId: ticket.assignedToId ?? user.sub,
          status: TicketStatus.EM_ANDAMENTO,
          requiresActionRole: this.getActionRole(TicketStatus.EM_ANDAMENTO),
          lastInteractionAt: new Date(),
          history: {
            create: {
              eventType: TicketHistoryEventType.STATUS_CHANGED,
              title: 'Atendimento iniciado',
              description: 'O Comercial iniciou o atendimento.',
              createdById: user.sub,
            },
          },
        },
        include: this.includeTicketRelations(user),
      });

      await this.notifyClient(
        tx,
        updated,
        user.sub,
        'Sua cotação está em análise',
        'Nossa equipe comercial iniciou a análise da sua solicitação.',
      );

      return updated;
    });

    return updatedTicket;
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateTicketStatusDto) {
    this.ensureInternalUser(user);
    await this.findOne(user, id);

    const updatedTicket = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id },
        data: {
          status: dto.status,
          requiresActionRole: this.getActionRole(dto.status),
          lastInteractionAt: new Date(),
          history: {
            create: {
              eventType:
                dto.status === TicketStatus.FECHADO
                  ? TicketHistoryEventType.CLOSED
                  : TicketHistoryEventType.STATUS_CHANGED,
              title: 'Status atualizado',
              description: `Status do ticket alterado para ${dto.status}.`,
              createdById: user.sub,
            },
          },
        },
        include: this.includeTicketRelations(user),
      });

      await this.notifyByStatus(tx, updated, user.sub, dto.status);
      return updated;
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.TICKET,
      action: AuditLogAction.TICKET_STATUS_CHANGED,
      message: `Status do ticket alterado para ${dto.status}.`,
      targetType: 'Ticket',
      targetId: id,
      userId: user.sub,
      details: {
        status: dto.status,
      },
    });

    return updatedTicket;
  }

  async reply(user: AuthUser, id: string, dto: CreateTicketMessageDto) {
    const ticket = await this.findOne(user, id);
    const message = this.sanitize(dto.message);

    if (!message) {
      throw new BadRequestException('Informe a resposta do ticket.');
    }

    const internalAuthor = this.isInternalUser(user);
    const isInternalNote =
      internalAuthor && (dto.isInternal === true || ticket.internalOnly);
    const senderType = internalAuthor
      ? MessageSenderType.INTERNO
      : MessageSenderType.CLIENTE;
    const nextStatus =
      user.role === 'CLIENTE'
        ? TicketStatus.AGUARDANDO_COMERCIAL
        : isInternalNote
          ? (dto.nextStatus ?? ticket.status)
          : (dto.nextStatus ?? TicketStatus.AGUARDANDO_CLIENTE);

    const updatedTicket = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id },
        data: {
          status: nextStatus,
          requiresActionRole: this.getActionRole(nextStatus),
          lastInteractionAt: new Date(),
          messages: {
            create: {
              senderType,
              message,
              isInternal: isInternalNote,
              createdById: user.sub,
            },
          },
          history: {
            create: {
              eventType: isInternalNote
                ? TicketHistoryEventType.INTERNAL_NOTE
                : TicketHistoryEventType.MESSAGE_SENT,
              title: isInternalNote ? 'Observação interna' : 'Mensagem enviada',
              description: isInternalNote
                ? 'Observação interna registrada.'
                : 'Nova mensagem registrada no ticket.',
              internalOnly: isInternalNote,
              createdById: user.sub,
            },
          },
        },
        include: this.includeTicketRelations(user),
      });

      const chat = await this.chatsService.ensureTicketChat(tx, {
        ticketId: updated.id,
        subject: updated.subject,
        actorId: user.sub,
        requesterId: updated.requesterId,
        assignedToId: updated.assignedToId,
        clientId: updated.clientId,
        clientUserId: updated.client?.userId,
        leadId: updated.leadId,
        quoteId: updated.quoteId,
        internalOnly: updated.internalOnly,
      });

      await this.chatsService.createMessageInTransaction(tx, {
        chatId: chat.id,
        authorId: user.sub,
        content: message,
        visibility: isInternalNote
          ? ChatMessageVisibility.GESTAO_COMERCIAL
          : ChatMessageVisibility.PUBLICA_CLIENTE,
      });

      if (user.role === 'CLIENTE') {
        await this.notifyCommercial(
          tx,
          updated,
          user.sub,
          'Cliente respondeu ao ticket',
          'O cliente respondeu uma demanda. Acesse o ticket para dar continuidade.',
        );
      } else if (!isInternalNote) {
        await this.notifyClient(
          tx,
          updated,
          user.sub,
          'Sua solicitação foi respondida',
          'Nossa equipe respondeu sua solicitação. Acesse o ticket para visualizar a devolutiva.',
        );
      }

      return updated;
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.TICKET,
      action: AuditLogAction.TICKET_RESPONDED,
      message: `Resposta registrada no ticket ${ticket.subject}.`,
      targetType: 'Ticket',
      targetId: id,
      userId: user.sub,
      details: {
        senderType,
        isInternal: isInternalNote,
        nextStatus,
      },
    });

    return updatedTicket;
  }

  async sendPreProposal(user: AuthUser, id: string, dto: SendPreProposalDto) {
    this.ensureInternalUser(user);
    const ticket = await this.findOne(user, id);
    const message = this.sanitize(dto.message);

    if (!message) {
      throw new BadRequestException('Informe a pré-proposta ou pré-contrato.');
    }

    if (ticket.prospectId && !ticket.clientId) {
      throw new BadRequestException(
        'Prospect precisa virar cliente ativo antes de contrato ou pré-contrato.',
      );
    }

    const opportunityId = dto.opportunityId ?? ticket.opportunityId;
    const now = new Date();
    const preContractNotes = this.sanitize(dto.preContractNotes) ?? message;
    const negotiatedValue =
      dto.valor !== undefined ? new Prisma.Decimal(dto.valor) : undefined;

    const updatedTicket = await this.prisma.$transaction(async (tx) => {
      const latestProposta = await tx.proposta.findFirst({
        where: { ticketId: id },
        orderBy: [
          {
            versao: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
      });
      const finalNegotiatedValue = this.assertPositiveProposalValue(
        negotiatedValue ?? latestProposta?.valor ?? ticket.quote?.price,
      );

      if (opportunityId) {
        await tx.opportunity.update({
          where: { id: opportunityId },
          data: {
            preContract: true,
            preContractNotes,
            value: finalNegotiatedValue,
            stage: OpportunityStage.PROPOSTA,
          },
        });
      }

      if (ticket.quoteId) {
        await tx.quote.update({
          where: { id: ticket.quoteId },
          data: {
            price: finalNegotiatedValue,
            commercialNotes: preContractNotes,
            status: QuoteStatus.ANSWERED,
            history: {
              create: {
                status: QuoteStatus.ANSWERED,
                notes: preContractNotes,
              },
            },
          },
        });
      }

      const reusableStatuses: StatusProposta[] = [
        StatusProposta.RASCUNHO,
        StatusProposta.ENVIADA_AO_CLIENTE,
        StatusProposta.AJUSTE_SOLICITADO_PELO_CLIENTE,
        StatusProposta.AJUSTE_SOLICITADO_PELA_GESTAO,
      ];
      const propostaBaseData: Prisma.PropostaUncheckedUpdateInput = {
        status: StatusProposta.ENVIADA_AO_CLIENTE,
        enviadaEm: now,
        enviadaPorId: user.sub,
        quoteId: ticket.quoteId ?? null,
        opportunityId: opportunityId ?? null,
        clientId: ticket.clientId ?? null,
        motivoRecusaCliente: null,
      };
      const titulo =
        this.sanitize(dto.titulo) ??
        latestProposta?.titulo ??
        `Pre-proposta - ${ticket.subject}`;

      propostaBaseData.titulo = titulo;
      propostaBaseData.descricao = message;

      if (dto.descricaoServico !== undefined) {
        propostaBaseData.descricaoServico = this.sanitize(dto.descricaoServico);
      } else if (
        !latestProposta?.descricaoServico &&
        ticket.quote?.serviceType
      ) {
        propostaBaseData.descricaoServico = ticket.quote.serviceType;
      }

      if (dto.origem !== undefined) {
        propostaBaseData.origem = this.sanitize(dto.origem);
      } else if (!latestProposta?.origem && ticket.quote?.origin) {
        propostaBaseData.origem = ticket.quote.origin;
      }

      if (dto.destino !== undefined) {
        propostaBaseData.destino = this.sanitize(dto.destino);
      } else if (!latestProposta?.destino && ticket.quote?.destination) {
        propostaBaseData.destino = ticket.quote.destination;
      }

      propostaBaseData.valor = finalNegotiatedValue;
      if (dto.condicoesPagamento !== undefined) {
        propostaBaseData.condicoesPagamento = this.sanitize(
          dto.condicoesPagamento,
        );
      }
      if (dto.condicoesComerciais !== undefined) {
        propostaBaseData.condicoesComerciais = this.sanitize(
          dto.condicoesComerciais,
        );
      }
      if (dto.observacoes !== undefined) {
        propostaBaseData.observacoes = this.sanitize(dto.observacoes);
      }
      if (dto.validadeDias !== undefined) {
        propostaBaseData.validadeDias = this.sanitize(dto.validadeDias);
      }
      if (dto.validaAte !== undefined) {
        propostaBaseData.validaAte = dto.validaAte
          ? new Date(dto.validaAte)
          : null;
      }

      let propostaId: string | null = null;
      let propostaCode: string | null = null;

      if (latestProposta && reusableStatuses.includes(latestProposta.status)) {
        const updatedProposta = await tx.proposta.update({
          where: { id: latestProposta.id },
          data: propostaBaseData,
          select: {
            id: true,
            code: true,
          },
        });

        propostaId = updatedProposta.id;
        propostaCode = updatedProposta.code;
      } else {
        const versao = (latestProposta?.versao ?? 0) + 1;
        const createdProposta = await tx.proposta.create({
          data: {
            ...propostaBaseData,
            code: `TMP-${Date.now()}`,
            ticketId: id,
            criadaPorId: user.sub,
            versao,
          } as Prisma.PropostaUncheckedCreateInput,
          select: {
            id: true,
          },
        });

        propostaCode = this.generateDisplayCode('PROP', createdProposta.id);

        await tx.proposta.update({
          where: { id: createdProposta.id },
          data: {
            code: propostaCode,
          },
        });

        propostaId = createdProposta.id;
      }

      const updated = await tx.ticket.update({
        where: { id },
        data: {
          type: TicketType.PRE_NEGOCIACAO,
          opportunityId: opportunityId ?? null,
          status: TicketStatus.AGUARDANDO_CLIENTE,
          requiresActionRole: UserRole.CLIENTE,
          lastInteractionAt: now,
          messages: {
            create: {
              senderType: MessageSenderType.INTERNO,
              message,
              createdById: user.sub,
            },
          },
          history: {
            create: {
              eventType: TicketHistoryEventType.PRE_PROPOSAL_SENT,
              title: 'Pré-proposta enviada',
              description:
                'Pré-proposta/pré-contrato enviado para análise do cliente.',
              createdById: user.sub,
              metadata: {
                propostaId,
                propostaCode,
                opportunityId: opportunityId ?? null,
                quoteId: ticket.quoteId ?? null,
                valorNegociado: finalNegotiatedValue.toString(),
              },
            },
          },
        },
        include: this.includeTicketRelations(user),
      });

      await this.notifyClient(
        tx,
        updated,
        user.sub,
        'Pré-proposta disponível para análise',
        'Sua proposta está disponível para análise. Acesse o ticket para aprovar, recusar ou solicitar ajuste.',
      );

      return updated;
    });

    return updatedTicket;
  }

  async clientDecision(
    user: AuthUser,
    id: string,
    dto: ClientTicketDecisionDto,
  ) {
    if (user.role !== 'CLIENTE') {
      throw new ForbiddenException('Apenas o cliente pode executar esta ação.');
    }

    const ticket = await this.findOne(user, id);

    const allowedClientDecisionStatuses: TicketStatus[] = [
      TicketStatus.AGUARDANDO_CLIENTE,
      TicketStatus.RESPONDIDO,
    ];

    if (!allowedClientDecisionStatuses.includes(ticket.status)) {
      throw new BadRequestException(
        'Este ticket não está aguardando ação do cliente.',
      );
    }

    const decisionMap = {
      APPROVE: {
        status: TicketStatus.APROVADO_CLIENTE,
        propostaStatus: StatusProposta.APROVADA_PELO_CLIENTE,
        propostaDateField: 'aprovadaPeloClienteEm',
        eventType: TicketHistoryEventType.APPROVED,
        title: 'Cliente aprovou a pré-negociacao',
        message: 'Cliente aprovou a proposta/pré-negociacao.',
      },
      REQUEST_ADJUSTMENT: {
        status: TicketStatus.AJUSTE_SOLICITADO,
        propostaStatus: StatusProposta.AJUSTE_SOLICITADO_PELO_CLIENTE,
        propostaDateField: 'ajusteSolicitadoPeloClienteEm',
        eventType: TicketHistoryEventType.ADJUSTMENT_REQUESTED,
        title: 'Cliente solicitou ajuste',
        message: 'Cliente solicitou ajuste na proposta/pré-negociacao.',
      },
      REJECT: {
        status: TicketStatus.REPROVADO,
        propostaStatus: StatusProposta.RECUSADA_PELO_CLIENTE,
        propostaDateField: 'recusadaPeloClienteEm',
        eventType: TicketHistoryEventType.REJECTED,
        title: 'Cliente recusou a pré-negociacao',
        message: 'Cliente recusou a proposta/pré-negociacao.',
      },
    }[dto.action];

    const message = this.sanitize(dto.message) ?? decisionMap.message;
    const now = new Date();

    const updatedTicket = await this.prisma.$transaction(async (tx) => {
      const latestProposta = await tx.proposta.findFirst({
        where: { ticketId: id },
        orderBy: [
          {
            versao: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
      });

      if (latestProposta) {
        await tx.proposta.update({
          where: { id: latestProposta.id },
          data: {
            status: decisionMap.propostaStatus,
            [decisionMap.propostaDateField]: now,
            motivoRecusaCliente:
              dto.action === 'REJECT'
                ? message
                : latestProposta.motivoRecusaCliente,
          } as Prisma.PropostaUncheckedUpdateInput,
        });
      }

      const updated = await tx.ticket.update({
        where: { id },
        data: {
          type:
            dto.action === 'REQUEST_ADJUSTMENT'
              ? TicketType.AJUSTE_CLIENTE
              : ticket.type,
          status: decisionMap.status,
          requiresActionRole: this.getActionRole(decisionMap.status),
          lastInteractionAt: now,
          messages: {
            create: {
              senderType: MessageSenderType.CLIENTE,
              message,
              createdById: user.sub,
            },
          },
          history: {
            create: {
              eventType: decisionMap.eventType,
              title: decisionMap.title,
              description: message,
              createdById: user.sub,
            },
          },
        },
        include: this.includeTicketRelations(user),
      });

      const chat = await this.chatsService.ensureTicketChat(tx, {
        ticketId: updated.id,
        subject: updated.subject,
        actorId: user.sub,
        requesterId: updated.requesterId,
        assignedToId: updated.assignedToId,
        clientId: updated.clientId,
        clientUserId: updated.client?.userId,
        leadId: updated.leadId,
        quoteId: updated.quoteId,
        internalOnly: updated.internalOnly,
      });

      await this.chatsService.createMessageInTransaction(tx, {
        chatId: chat.id,
        authorId: user.sub,
        content: message,
        visibility: ChatMessageVisibility.PUBLICA_CLIENTE,
      });

      await this.notifyCommercial(
        tx,
        updated,
        user.sub,
        decisionMap.title,
        decisionMap.message,
      );

      if (dto.action === 'REJECT') {
        await this.notifyManagement(
          tx,
          updated,
          user.sub,
          decisionMap.title,
          message,
        );
      }

      return updated;
    });

    if (dto.action === 'REJECT') {
      await this.auditLogsService.create({
        category: AuditLogCategory.TICKET,
        action: AuditLogAction.PROPOSAL_REJECTED,
        message: `Cliente recusou a proposta/pre-negociacao do ticket ${ticket.subject}.`,
        targetType: 'Ticket',
        targetId: id,
        userId: user.sub,
        details: {
          ticketId: id,
          motivo: message,
        },
      });
    }

    return updatedTicket;
  }

  async sendToManagement(user: AuthUser, id: string, dto: SendToManagementDto) {
    this.ensureInternalUser(user);
    const ticket = await this.findOne(user, id);

    if (ticket.status !== TicketStatus.APROVADO_CLIENTE) {
      throw new BadRequestException(
        'Envio para Gestão permitido apenas depois da aprovação do cliente.',
      );
    }

    const publicMessage =
      this.sanitize(dto.message) ?? 'Sua negociacao está em validacao interna.';

    const updatedTicket = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id },
        data: {
          type: TicketType.APROVACAO_GESTAO,
          status: TicketStatus.AGUARDANDO_GESTAO,
          requiresActionRole: UserRole.GESTAO,
          lastInteractionAt: new Date(),
          messages: {
            create: {
              senderType: MessageSenderType.INTERNO,
              message: publicMessage,
              isInternal: ticket.internalOnly,
              createdById: user.sub,
            },
          },
          history: {
            create: {
              eventType: TicketHistoryEventType.APPROVAL_SENT,
              title: 'Enviado para aprovação da Gestão',
              description: 'Negociacao enviada para aprovação da Gestão.',
              internalOnly: ticket.internalOnly,
              createdById: user.sub,
            },
          },
        },
        include: this.includeTicketRelations(user),
      });

      const managementParticipantIds =
        await this.notificationsService.getUserIdsByRoles(
          [UserRole.GESTAO, UserRole.ADMIN],
          tx,
        );
      const chat = await this.chatsService.ensureTicketChat(tx, {
        ticketId: updated.id,
        subject: updated.subject,
        actorId: user.sub,
        requesterId: updated.requesterId,
        assignedToId: updated.assignedToId,
        clientId: updated.clientId,
        clientUserId: updated.client?.userId,
        leadId: updated.leadId,
        quoteId: updated.quoteId,
        internalOnly: updated.internalOnly,
        participantUserIds: managementParticipantIds,
      });

      await this.chatsService.createMessageInTransaction(tx, {
        chatId: chat.id,
        authorId: user.sub,
        content: publicMessage,
        visibility: ChatMessageVisibility.GESTAO_COMERCIAL,
      });

      await this.notifyManagement(
        tx,
        updated,
        user.sub,
        'Negociacao aguardando aprovação da Gestão',
        'Uma negociacao foi enviada para aprovação da Gestão.',
      );
      if (!ticket.internalOnly) {
        await this.notifyClient(
          tx,
          updated,
          user.sub,
          'Sua negociacao está em validacao interna',
          'Sua negociacao está em validacao interna.',
        );
      }

      return updated;
    });

    return updatedTicket;
  }

  async managementDecision(
    user: AuthUser,
    id: string,
    dto: ManagementTicketDecisionDto,
  ) {
    if (!['ADMIN', 'GESTAO'].includes(user.role)) {
      throw new ForbiddenException('Apenas Gestão pode executar esta ação.');
    }

    const ticket = await this.findOne(user, id);

    if (ticket.status !== TicketStatus.AGUARDANDO_GESTAO) {
      throw new BadRequestException(
        'Ticket não está aguardando aprovação da Gestão.',
      );
    }

    const decisionMap = {
      APPROVE: {
        status: TicketStatus.APROVADO_GESTAO,
        eventType: TicketHistoryEventType.APPROVED,
        title: 'Gestão aprovou a negociacao',
        commercialMessage: 'Gestão aprovou a negociacao.',
        clientMessage:
          'Sua negociacao foi aprovada. O serviço seguirá para execução.',
      },
      REQUEST_ADJUSTMENT: {
        status: TicketStatus.AJUSTE_SOLICITADO,
        eventType: TicketHistoryEventType.ADJUSTMENT_REQUESTED,
        title: 'Gestão solicitou ajuste',
        commercialMessage: 'Gestão solicitou ajuste na negociacao.',
        clientMessage: 'Sua negociacao precisa de ajustes internos.',
      },
      REJECT: {
        status: TicketStatus.REPROVADO,
        eventType: TicketHistoryEventType.REJECTED,
        title: 'Gestão reprovou a negociacao',
        commercialMessage: 'Gestão reprovou a negociacao.',
        clientMessage: 'Sua negociacao foi reavaliada pela equipe.',
      },
    }[dto.action];

    const note = this.sanitize(dto.message);

    const updatedTicket = await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.TicketUpdateInput = {
        type:
          dto.action === 'REQUEST_ADJUSTMENT'
            ? TicketType.AJUSTE_GESTAO
            : ticket.type,
        status: decisionMap.status,
        requiresActionRole: this.getActionRole(decisionMap.status),
        lastInteractionAt: new Date(),
        history: {
          create: {
            eventType: decisionMap.eventType,
            title: decisionMap.title,
            description: note ?? decisionMap.commercialMessage,
            internalOnly: dto.action !== 'APPROVE',
            createdById: user.sub,
          },
        },
      };

      if (note) {
        updateData.messages = {
          create: {
            senderType: MessageSenderType.INTERNO,
            message: note,
            isInternal: dto.action !== 'APPROVE',
            createdById: user.sub,
          },
        };
      }

      if (dto.action === 'APPROVE' && ticket.opportunityId) {
        const latestProposta = await tx.proposta.findFirst({
          where: {
            ticketId: id,
            valor: {
              not: null,
            },
          },
          orderBy: [
            {
              versao: 'desc',
            },
            {
              updatedAt: 'desc',
            },
          ],
          select: {
            valor: true,
          },
        });
        const negotiatedValue =
          latestProposta?.valor ?? ticket.quote?.price ?? null;

        if (!negotiatedValue || negotiatedValue.lte(0)) {
          throw new BadRequestException(
            'Informe o valor do serviço negociado antes de aprovar a negociacao.',
          );
        }

        await tx.opportunity.update({
          where: { id: ticket.opportunityId },
          data: {
            value: negotiatedValue,
            stage: OpportunityStage.GANHO,
            status: OpportunityStatus.WON,
          },
        });
      }

      const updated = await tx.ticket.update({
        where: { id },
        data: updateData,
        include: this.includeTicketRelations(user),
      });

      const chat = await this.chatsService.ensureTicketChat(tx, {
        ticketId: updated.id,
        subject: updated.subject,
        actorId: user.sub,
        requesterId: updated.requesterId,
        assignedToId: updated.assignedToId,
        clientId: updated.clientId,
        clientUserId: updated.client?.userId,
        leadId: updated.leadId,
        quoteId: updated.quoteId,
        internalOnly: updated.internalOnly,
      });

      await this.chatsService.createMessageInTransaction(tx, {
        chatId: chat.id,
        authorId: user.sub,
        content: note ?? decisionMap.commercialMessage,
        visibility:
          dto.action === 'APPROVE' && !ticket.internalOnly
            ? ChatMessageVisibility.PUBLICA_CLIENTE
            : ChatMessageVisibility.GESTAO_COMERCIAL,
      });

      await this.notifyCommercial(
        tx,
        updated,
        user.sub,
        decisionMap.title,
        decisionMap.commercialMessage,
      );

      if (
        !ticket.internalOnly &&
        (dto.action === 'APPROVE' || dto.notifyClient)
      ) {
        await this.notifyClient(
          tx,
          updated,
          user.sub,
          decisionMap.title,
          decisionMap.clientMessage,
        );
      }

      return updated;
    });

    return updatedTicket;
  }
}
