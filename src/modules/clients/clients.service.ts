import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OpportunityStatus,
  Prisma,
  Quote,
  QuoteHistory,
  TimelineEvent,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateTimelineNoteDto } from './dto/create-timeline-note.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureInternalUser(user: { sub: string; role: string }) {
    const allowedRoles = ['ADMIN', 'GESTAO', 'COMERCIAL'];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Voce nao tem permissao para acessar este recurso.',
      );
    }
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
        description: history.notes ?? `Status alterado para ${history.status}`,
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
          in: ['ADMIN', 'GESTAO', 'COMERCIAL'],
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

    const [clients, opportunities] = await Promise.all([
      this.prisma.client.findMany({
        select: {
          id: true,
        },
      }),
      this.prisma.opportunity.findMany({
        select: {
          stage: true,
          status: true,
          value: true,
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
      totalLeads: clients.length,
      openOpportunities: openOpportunities.length,
      wonOpportunities: wonOpportunities.length,
      conversionRate:
        opportunities.length === 0
          ? 0
          : Number(((wonOpportunities.length / opportunities.length) * 100).toFixed(1)),
      openValue: openOpportunities.reduce(
        (total, opportunity) => total + this.toNumber(opportunity.value),
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
    const changedFields = [
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

    return this.prisma.$transaction(async (tx) => {
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
  }
}
