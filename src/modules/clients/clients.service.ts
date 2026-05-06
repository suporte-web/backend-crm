import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditLogAction,
  AuditLogCategory,
  ClientDeletionRequestStatus,
  OpportunityStatus,
  Prisma,
  Quote,
  QuoteHistory,
  QuoteStatus,
  TimelineEvent,
  TimelineEventType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTimelineNoteDto } from './dto/create-timeline-note.dto';
import { DecideClientDeletionDto } from './dto/decide-client-deletion.dto';
import { RequestClientDeletionDto } from './dto/request-client-deletion.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private ensureInternalUser(user: { sub: string; role: string }) {
    const allowedRoles = ['ADMIN', 'GESTAO', 'COMERCIAL', 'MARKETING'];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Voce nao tem permissao para acessar este recurso.',
      );
    }
  }

  private ensureManagementUser(user: { sub: string; role: string }) {
    const allowedRoles = ['ADMIN', 'GESTAO'];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Voce nao tem permissao para aprovar esta solicitacao.',
      );
    }
  }

  private sanitize(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private formatQuoteStatus(status: QuoteStatus) {
    const labels: Record<QuoteStatus, string> = {
      RECEIVED: 'Recebida',
      IN_ANALYSIS: 'Em analise',
      ANSWERED: 'Respondida',
      APPROVED: 'Aprovada',
      REJECTED: 'Rejeitada',
    };

    return labels[status];
  }

  private async getClientOrFail(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        user: true,
        quotes: {
          include: {
            history: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        opportunities: {
          orderBy: {
            updatedAt: 'desc',
          },
        },
        timelineEvents: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    return client;
  }

  private buildQuoteTimelineEvents(quotes: (Quote & { history: QuoteHistory[] })[]) {
    return quotes.flatMap((quote) => {
      const createdEvent = {
        id: `quote-created-${quote.id}`,
        source: 'QUOTE',
        type: 'QUOTE_CREATED',
        date: quote.createdAt,
        quoteId: quote.id,
        title: 'Cotacao criada',
        description: `${quote.origin} -> ${quote.destination}`,
        status: quote.status,
      };

      const historyEvents = quote.history.map((history) => ({
        id: `quote-history-${history.id}`,
        source: 'QUOTE',
        type: 'QUOTE_STATUS',
        date: history.createdAt,
        quoteId: quote.id,
        title: 'Status da cotacao atualizado',
        description:
          history.notes ??
          `Status alterado para ${this.formatQuoteStatus(history.status)}.`,
        status: history.status,
      }));

      return [createdEvent, ...historyEvents];
    });
  }

  private buildStoredTimelineEvents(
    timelineEvents: (TimelineEvent & {
      createdBy: { id: string; name: string; email: string } | null;
    })[],
  ) {
    return timelineEvents.map((event) => ({
      id: event.id,
      source: 'CRM',
      type: event.type,
      date: event.createdAt,
      title: event.title,
      description: event.description,
      metadata: event.metadata,
      createdBy: event.createdBy,
    }));
  }

  private buildCombinedTimeline(client: {
    timelineEvents: (TimelineEvent & {
      createdBy: { id: string; name: string; email: string } | null;
    })[];
    quotes: (Quote & { history: QuoteHistory[] })[];
  }) {
    return [
      ...this.buildStoredTimelineEvents(client.timelineEvents),
      ...this.buildQuoteTimelineEvents(client.quotes),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private toNumber(value: Prisma.Decimal | null | undefined) {
    return Number(value?.toString() ?? 0);
  }

  async findMine(userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { userId },
      include: {
        user: true,
        quotes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Perfil do cliente nao encontrado.');
    }

    return client;
  }

  async findAll(
    user: { sub: string; role: string },
    filters: {
      internalOwnerId?: string;
      status?: string;
      segment?: string;
    },
  ) {
    this.ensureInternalUser(user);

    const where: {
      internalOwnerId?: string;
      status?: string;
      segment?: string;
    } = {};

    if (filters.internalOwnerId) {
      where.internalOwnerId = filters.internalOwnerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.segment) {
      where.segment = filters.segment;
    }

    return this.prisma.client.findMany({
      where,
      include: {
        user: true,
        opportunities: {
          orderBy: {
            updatedAt: 'desc',
          },
        },
        quotes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMyPortfolio(
    user: { sub: string; role: string },
    filters: { status?: string; segment?: string },
  ) {
    this.ensureInternalUser(user);

    const where: {
      internalOwnerId: string;
      status?: string;
      segment?: string;
    } = {
      internalOwnerId: user.sub,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.segment) {
      where.segment = filters.segment;
    }

    return this.prisma.client.findMany({
      where,
      include: {
        user: true,
        opportunities: {
          orderBy: {
            updatedAt: 'desc',
          },
        },
        quotes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getOwnersSummary(user: { sub: string; role: string }) {
    this.ensureInternalUser(user);

    const internalUsers = await this.prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'GESTAO', 'COMERCIAL', 'MARKETING'],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const clients = await this.prisma.client.findMany({
      select: {
        id: true,
        internalOwnerId: true,
        status: true,
      },
    });

    return internalUsers.map((internalUser) => {
      const ownedClients = clients.filter(
        (client) => client.internalOwnerId === internalUser.id,
      );

      const activeClients = ownedClients.filter(
        (client) => client.status === 'ATIVO',
      );

      return {
        owner: internalUser,
        metrics: {
          totalClients: ownedClients.length,
          activeClients: activeClients.length,
        },
      };
    });
  }

  async findOne(user: { sub: string; role: string }, id: string) {
    this.ensureInternalUser(user);
    return this.getClientOrFail(id);
  }

  async getSummary(user: { sub: string; role: string }, id: string) {
    this.ensureInternalUser(user);

    const client = await this.getClientOrFail(id);
    const totalQuotes = client.quotes.length;
    const totalOpportunities = client.opportunities.length;
    const openOpportunities = client.opportunities.filter(
      (opportunity) => opportunity.status === OpportunityStatus.OPEN,
    );
    const wonOpportunities = client.opportunities.filter(
      (opportunity) => opportunity.status === OpportunityStatus.WON,
    );

    const quotesByStatus = client.quotes.reduce(
      (acc, quote) => {
        acc[quote.status] = (acc[quote.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      client: {
        id: client.id,
        document: client.document,
        phone: client.phone,
        companyName: client.companyName,
        segment: client.segment,
        notes: client.notes,
        status: client.status,
        internalOwnerId: client.internalOwnerId,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        user: {
          id: client.user.id,
          name: client.user.name,
          email: client.user.email,
          role: client.user.role,
        },
      },
      metrics: {
        totalQuotes,
        quotesByStatus,
        totalOpportunities,
        openOpportunities: openOpportunities.length,
        wonOpportunities: wonOpportunities.length,
        conversionRate:
          totalOpportunities === 0
            ? 0
            : Number(
                ((wonOpportunities.length / totalOpportunities) * 100).toFixed(1),
              ),
        openValue: openOpportunities.reduce(
          (total, opportunity) => total + this.toNumber(opportunity.value),
          0,
        ),
      },
      lastQuote: client.quotes[0] ?? null,
      lastOpportunity: client.opportunities[0] ?? null,
      timeline: this.buildCombinedTimeline(client).slice(0, 20),
    };
  }

  async getDetail(user: AuthUser, id: string) {
    this.ensureInternalUser(user);

    const client = await this.getClientOrFail(id);
    const openOpportunities = client.opportunities.filter(
      (opportunity) => opportunity.status === OpportunityStatus.OPEN,
    );
    const wonOpportunities = client.opportunities.filter(
      (opportunity) => opportunity.status === OpportunityStatus.WON,
    );

    return {
      client: {
        id: client.id,
        document: client.document,
        phone: client.phone,
        companyName: client.companyName,
        segment: client.segment,
        notes: client.notes,
        status: client.status,
        internalOwnerId: client.internalOwnerId,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        user: {
          id: client.user.id,
          name: client.user.name,
          email: client.user.email,
          role: client.user.role,
        },
      },
      opportunities: client.opportunities,
      timeline: this.buildCombinedTimeline(client),
      metrics: {
        totalQuotes: client.quotes.length,
        totalOpportunities: client.opportunities.length,
        openOpportunities: openOpportunities.length,
        wonOpportunities: wonOpportunities.length,
        conversionRate:
          client.opportunities.length === 0
            ? 0
            : Number(
                ((wonOpportunities.length / client.opportunities.length) * 100).toFixed(1),
              ),
        openValue: openOpportunities.reduce(
          (total, opportunity) => total + this.toNumber(opportunity.value),
          0,
        ),
      },
    };
  }

  async getTimeline(user: { sub: string; role: string }, id: string) {
    this.ensureInternalUser(user);
    const client = await this.getClientOrFail(id);
    return this.buildCombinedTimeline(client);
  }

  async createTimelineNote(user: AuthUser, id: string, dto: CreateTimelineNoteDto) {
    this.ensureInternalUser(user);
    await this.getClientOrFail(id);

    return this.prisma.timelineEvent.create({
      data: {
        clientId: id,
        type: TimelineEventType.NOTE_ADDED,
        title: dto.title?.trim() || 'Observacao adicionada',
        description: dto.description.trim(),
        createdById: user.sub,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getDashboardSummary(user: AuthUser) {
    this.ensureInternalUser(user);

    const [clients, opportunities, quotes, tickets, users, leads] = await Promise.all([
      this.prisma.client.findMany({
        select: {
          id: true,
          status: true,
        },
      }),
      this.prisma.opportunity.findMany({
        select: {
          stage: true,
          status: true,
          value: true,
        },
      }),
      this.prisma.quote.findMany({
        select: {
          status: true,
          price: true,
        },
      }),
      this.prisma.ticket.findMany({
        select: {
          status: true,
        },
      }),
      this.prisma.user.findMany({
        select: {
          id: true,
          isActive: true,
        },
      }),
      this.prisma.lead.findMany({
        select: {
          id: true,
          status: true,
        },
      }),
    ]);

    const openOpportunities = opportunities.filter(
      (opportunity) => opportunity.status === OpportunityStatus.OPEN,
    );
    const wonOpportunities = opportunities.filter(
      (opportunity) => opportunity.status === OpportunityStatus.WON,
    );

    return {
      totalClients: clients.length,
      activeClients: clients.filter((client) => client.status === 'ATIVO').length,
      totalLeads: leads.length,
      newLeads: leads.filter((lead) => lead.status === 'new').length,
      openOpportunities: openOpportunities.length,
      wonOpportunities: wonOpportunities.length,
      totalQuotes: quotes.length,
      openQuotes: quotes.filter((quote) =>
        ['RECEIVED', 'IN_ANALYSIS'].includes(quote.status),
      ).length,
      answeredQuotes: quotes.filter((quote) => quote.status === 'ANSWERED').length,
      totalTickets: tickets.length,
      openTickets: tickets.filter(
        (ticket) => !['FECHADO', 'CANCELADO', 'CLOSED'].includes(ticket.status),
      ).length,
      closedTickets: tickets.filter((ticket) =>
        ['FECHADO', 'CANCELADO', 'CLOSED'].includes(ticket.status),
      ).length,
      usersWithAccess: users.filter((item) => item.isActive).length,
      conversionRate:
        opportunities.length === 0
          ? 0
          : Number(((wonOpportunities.length / opportunities.length) * 100).toFixed(1)),
      openValue: openOpportunities.reduce(
        (total, opportunity) => total + this.toNumber(opportunity.value),
        0,
      ),
      answeredQuoteValue: quotes.reduce(
        (total, quote) => total + this.toNumber(quote.price),
        0,
      ),
      opportunitiesByStage: [
        'NOVO',
        'QUALIFICADO',
        'PROPOSTA',
        'NEGOCIACAO',
        'GANHO',
        'PERDIDO',
      ].map((stage) => {
        const stageItems = opportunities.filter((opportunity) => opportunity.stage === stage);

        return {
          stage,
          count: stageItems.length,
          value: stageItems.reduce(
            (total, opportunity) => total + this.toNumber(opportunity.value),
            0,
          ),
        };
      }),
    };
  }

  async update(user: { sub: string; role: string }, id: string, dto: UpdateClientDto) {
    this.ensureInternalUser(user);

    const existingClient = await this.getClientOrFail(id);
    const sanitizedName =
      dto.name !== undefined ? this.sanitize(dto.name) : undefined;
    const sanitizedEmail =
      dto.email !== undefined ? this.sanitize(dto.email) : undefined;

    if (dto.name !== undefined && !sanitizedName) {
      throw new BadRequestException('Informe o nome do cliente.');
    }

    if (dto.email !== undefined && !sanitizedEmail) {
      throw new BadRequestException('Informe o e-mail do cliente.');
    }

    const name = sanitizedName ?? undefined;
    const email = sanitizedEmail ?? undefined;

    if (email && email !== existingClient.user.email) {
      const emailInUse = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (emailInUse && emailInUse.id !== existingClient.userId) {
        throw new BadRequestException('E-mail ja esta em uso.');
      }
    }

    const changedFields = [
      name !== undefined && name !== existingClient.user.name ? 'nome' : null,
      email !== undefined && email !== existingClient.user.email ? 'e-mail' : null,
      dto.document !== undefined && dto.document !== existingClient.document
        ? 'documento'
        : null,
      dto.phone !== undefined && dto.phone !== existingClient.phone ? 'telefone' : null,
      dto.companyName !== undefined && dto.companyName !== existingClient.companyName
        ? 'empresa'
        : null,
      dto.segment !== undefined && dto.segment !== existingClient.segment ? 'segmento' : null,
      dto.notes !== undefined && dto.notes !== existingClient.notes ? 'observacoes' : null,
      dto.status !== undefined && dto.status !== existingClient.status ? 'status' : null,
      dto.internalOwnerId !== undefined &&
      dto.internalOwnerId !== existingClient.internalOwnerId
        ? 'responsavel interno'
        : null,
    ].filter(Boolean);

    const updatedClient = await this.prisma.$transaction(async (tx) => {
      if (name !== undefined || email !== undefined) {
        await tx.user.update({
          where: { id: existingClient.userId },
          data: {
            name,
            email,
          },
        });
      }

      const updatedClient = await tx.client.update({
        where: { id },
        data: {
          document: dto.document,
          phone: dto.phone,
          companyName: dto.companyName,
          segment: dto.segment,
          notes: dto.notes,
          status: dto.status,
          internalOwnerId: dto.internalOwnerId,
        },
        include: {
          user: true,
          quotes: true,
          opportunities: true,
        },
      });

      if (changedFields.length > 0) {
        await tx.timelineEvent.create({
          data: {
            clientId: id,
            type: TimelineEventType.LEAD_UPDATED,
            title: 'Lead atualizado',
            description: `Campos atualizados: ${changedFields.join(', ')}.`,
            createdById: user.sub,
            metadata: {
              changedFields,
            },
          },
        });
      }

      return updatedClient;
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.CLIENT,
      action: AuditLogAction.CLIENT_UPDATED,
      message: `Cliente atualizado: ${existingClient.companyName ?? existingClient.user.name}.`,
      targetType: 'Client',
      targetId: id,
      userId: user.sub,
      details: {
        changedFields,
      },
    });

    if (changedFields.length > 0) {
      await this.notificationsService.notifyUsers(
        [user.sub, updatedClient.internalOwnerId, updatedClient.userId],
        {
          title: 'Cliente atualizado',
          message: `Cadastro de ${
            updatedClient.companyName ?? updatedClient.user.name
          } atualizado: ${changedFields.join(', ')}.`,
          link: `/clients/${updatedClient.id}`,
          actorId: user.sub,
          metadata: {
            clientId: updatedClient.id,
            changedFields,
            action: 'CLIENT_UPDATED',
          },
        },
      );
    }

    return updatedClient;
  }

  async getDeletionRequests(user: AuthUser, status?: string) {
    this.ensureInternalUser(user);

    const where: Prisma.ClientDeletionRequestWhereInput = {};

    if (status) {
      if (
        !Object.values(ClientDeletionRequestStatus).includes(
          status as ClientDeletionRequestStatus,
        )
      ) {
        throw new BadRequestException('Status de solicitacao invalido.');
      }

      where.status = status as ClientDeletionRequestStatus;
    }

    return this.prisma.clientDeletionRequest.findMany({
      where,
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async requestDeletion(
    user: AuthUser,
    id: string,
    dto: RequestClientDeletionDto,
  ) {
    this.ensureInternalUser(user);
    const client = await this.getClientOrFail(id);

    const pendingRequest = await this.prisma.clientDeletionRequest.findFirst({
      where: {
        clientId: id,
        status: ClientDeletionRequestStatus.PENDENTE,
      },
    });

    if (pendingRequest) {
      throw new BadRequestException(
        'Ja existe uma solicitacao de exclusao pendente para este cliente.',
      );
    }

    const request = await this.prisma.clientDeletionRequest.create({
      data: {
        clientId: client.id,
        requestedById: user.sub,
        reason: this.sanitize(dto.reason),
        clientNameSnapshot: client.companyName ?? client.user.name,
        clientEmailSnapshot: client.user.email,
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    await this.prisma.timelineEvent.create({
      data: {
        clientId: id,
        type: TimelineEventType.NOTE_ADDED,
        title: 'Solicitacao de exclusao criada',
        description:
          this.sanitize(dto.reason) ??
          'Solicitacao enviada para aprovacao da Gestao.',
        createdById: user.sub,
        metadata: {
          deletionRequestId: request.id,
          status: request.status,
        },
      },
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.CLIENT,
      action: AuditLogAction.CUSTOM,
      message: `Solicitacao de exclusao criada para ${
        client.companyName ?? client.user.name
      }.`,
      targetType: 'ClientDeletionRequest',
      targetId: request.id,
      userId: user.sub,
      details: {
        clientId: client.id,
        clientName: client.companyName ?? client.user.name,
      },
    });

    await this.notificationsService.notifyRoles(
      [UserRole.ADMIN, UserRole.GESTAO],
      {
        title: 'Solicitacao de exclusao de cliente',
        message: `${
          client.companyName ?? client.user.name
        } foi enviado para aprovacao de exclusao.`,
        link: '/clients',
        actorId: user.sub,
        metadata: {
          clientId: client.id,
          deletionRequestId: request.id,
          action: 'CLIENT_DELETION_REQUESTED',
        },
      },
    );

    return request;
  }

  async decideDeletionRequest(
    user: AuthUser,
    requestId: string,
    dto: DecideClientDeletionDto,
  ) {
    this.ensureManagementUser(user); 

    const request = await this.prisma.clientDeletionRequest.findUnique({
      where: { id: requestId },
      include: {
        client: {
          include: {
            user: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitacao de exclusao nao encontrada.');
    }

    if (request.status !== ClientDeletionRequestStatus.PENDENTE) {
      throw new BadRequestException(
        'Esta solicitacao de exclusao ja foi analisada.',
      );
    }

    const managementResponse = this.sanitize(dto.message);
    const now = new Date();

    if (dto.action === 'REJECT') {
      const rejected = await this.prisma.clientDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: ClientDeletionRequestStatus.RECUSADA,
          approvedById: user.sub,
          managementResponse,
          decidedAt: now,
        },
        include: {
          requestedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (request.clientId) {
        await this.prisma.timelineEvent.create({
          data: {
            clientId: request.clientId,
            type: TimelineEventType.NOTE_ADDED,
            title: 'Solicitacao de exclusao recusada',
            description:
              managementResponse ??
              'A Gestao recusou a solicitacao de exclusao do cliente.',
            createdById: user.sub,
            metadata: {
              deletionRequestId: requestId,
              status: rejected.status,
            },
          },
        });
      }

      await this.auditLogsService.create({
        category: AuditLogCategory.CLIENT,
        action: AuditLogAction.CUSTOM,
        message: `Solicitacao de exclusao recusada para ${
          request.clientNameSnapshot ?? request.client?.companyName ?? 'cliente'
        }.`,
        targetType: 'ClientDeletionRequest',
        targetId: requestId,
        userId: user.sub,
        details: {
          decision: 'REJECT',
          clientId: request.clientId,
        },
      });

      await this.notificationsService.notifyUsers([request.requestedBy.id], {
        title: 'Exclusao de cliente recusada',
        message: `A solicitacao de exclusao de ${
          request.clientNameSnapshot ?? request.client?.companyName ?? 'cliente'
        } foi recusada.`,
        link: request.clientId ? `/clients/${request.clientId}` : '/clients',
        actorId: user.sub,
        metadata: {
          clientId: request.clientId,
          deletionRequestId: requestId,
          action: 'CLIENT_DELETION_REJECTED',
        },
      });

      return {
        message: 'Solicitacao de exclusao recusada.',
        request: rejected,
      };
    }

    if (!request.client || !request.client.user) {
      throw new BadRequestException(
        'O cliente vinculado a esta solicitacao nao esta mais disponivel.',
      );
    }

    const targetClientId = request.client.id;
    const targetUserId = request.client.user.id;
    const targetName = request.client.companyName ?? request.client.user.name;
    const targetEmail = request.client.user.email;

    await this.prisma.$transaction(async (tx) => {
      await tx.clientDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: ClientDeletionRequestStatus.APROVADA,
          approvedById: user.sub,
          managementResponse,
          decidedAt: now,
        },
      });

      await tx.user.delete({
        where: { id: targetUserId },
      });
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.CLIENT,
      action: AuditLogAction.CUSTOM,
      message: `Exclusao aprovada para ${targetName}.`,
      targetType: 'ClientDeletionRequest',
      targetId: requestId,
      userId: user.sub,
      details: {
        decision: 'APPROVE',
        clientId: targetClientId,
        clientEmail: targetEmail,
      },
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.USER,
      action: AuditLogAction.USER_DELETED,
      message: `Usuario removido apos aprovacao da Gestao: ${targetEmail}.`,
      targetType: 'User',
      targetId: targetUserId,
      userId: user.sub,
      details: {
        clientId: targetClientId,
        clientName: targetName,
      },
    });

    await this.notificationsService.notifyUsers([request.requestedBy.id], {
      title: 'Cliente excluido',
      message: `${targetName} foi excluido apos aprovacao da Gestao.`,
      link: '/clients',
      actorId: user.sub,
      metadata: {
        clientId: targetClientId,
        deletionRequestId: requestId,
        action: 'CLIENT_DELETED',
      },
    });

    return {
      message: 'Cliente excluido com aprovacao da Gestao.',
      request: {
        id: requestId,
        status: ClientDeletionRequestStatus.APROVADA,
        clientNameSnapshot: targetName,
        clientEmailSnapshot: targetEmail,
        decidedAt: now,
      },
    };
  }
}
