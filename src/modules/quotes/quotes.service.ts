import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditLogAction,
  AuditLogCategory,
  MessageSenderType,
  OpportunityStage,
  QuoteStatus,
  TicketHistoryEventType,
  TicketStatus,
  TicketType,
  UserRole,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { RespondQuoteDto } from './dto/respond-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private ensureInternalUser(user: { sub: string; role: string }) {
    const allowedRoles = ['ADMIN', 'GESTAO', 'COMERCIAL'];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }
  }

  async create(clientId: string, dto: CreateQuoteDto, user?: { sub: string }) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        user: true,
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    const shouldCreatePreContract =
      dto.requestType?.toLowerCase().includes('contrato') ?? false;

    const quote = await this.prisma.$transaction(async (tx) => {
      const createdQuote = await tx.quote.create({
        data: {
          clientId,
          origin: dto.origin,
          destination: dto.destination,
          serviceType: dto.serviceType,
          requestType: dto.requestType,
          pickupAddress: dto.pickupAddress,
          deliveryAddress: dto.deliveryAddress,
          cargoDescription: dto.cargoDescription,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail,
          weight: dto.weight,
          volume: dto.volume,
          quantity: dto.quantity,
          merchandiseValue:
            dto.merchandiseValue !== undefined ? dto.merchandiseValue : undefined,
          desiredDeadline: dto.desiredDeadline
            ? new Date(dto.desiredDeadline)
            : null,
          notes: dto.notes,
          history: {
            create: {
              status: QuoteStatus.RECEIVED,
              notes: 'Cotacao criada pelo cliente',
            },
          },
        },
        include: {
          history: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          client: {
            include: {
              user: true,
            },
          },
        },
      });

      const opportunity = await tx.opportunity.create({
        data: {
          clientId,
          quoteId: createdQuote.id,
          title: shouldCreatePreContract
            ? `Pre-contrato - ${dto.serviceType}`
            : `Cotacao - ${dto.serviceType}`,
          value:
            dto.merchandiseValue !== undefined
              ? dto.merchandiseValue
              : undefined,
          stage: OpportunityStage.NOVO,
          preContract: shouldCreatePreContract,
          preContractNotes: shouldCreatePreContract
            ? 'Pre-contrato criado automaticamente a partir da cotacao do cliente.'
            : undefined,
        },
      });

      await tx.timelineEvent.create({
        data: {
          clientId,
          type: TimelineEventType.OPPORTUNITY_CREATED,
          title: 'Oportunidade criada pela cotacao',
          description: `Cotacao ${createdQuote.serviceType} entrou no pipeline comercial.`,
          createdById: user?.sub,
          metadata: {
            quoteId: createdQuote.id,
            opportunityId: opportunity.id,
            preContract: shouldCreatePreContract,
          },
        },
      });

      const ticket = await tx.ticket.create({
        data: {
          clientId,
          quoteId: createdQuote.id,
          opportunityId: opportunity.id,
          requesterId: user?.sub ?? client.userId,
          type: TicketType.COTACAO,
          status: TicketStatus.AGUARDANDO_COMERCIAL,
          requiresActionRole: UserRole.COMERCIAL,
          lastInteractionAt: new Date(),
          subject: `Nova cotacao: ${dto.serviceType}`,
          description: `Cliente ${client.companyName ?? client.user.name} enviou cotacao de ${dto.origin} para ${dto.destination}.`,
          messages: {
            create: {
              senderType: MessageSenderType.CLIENTE,
              message:
                dto.notes?.trim() ||
                `Cotacao criada para ${dto.serviceType}: ${dto.origin} -> ${dto.destination}.`,
              createdById: user?.sub,
            },
          },
          history: {
            create: {
              eventType: TicketHistoryEventType.CREATED,
              title: 'Cotacao recebida',
              description:
                'Ticket criado automaticamente a partir da cotacao do cliente.',
              createdById: user?.sub ?? client.userId,
            },
          },
        },
      });

      await this.notificationsService.notifyUsers(
        [client.userId],
        {
          ticketId: ticket.id,
          title: 'Sua cotacao foi recebida',
          message:
            'Sua cotacao foi enviada com sucesso. Nossa equipe comercial ira analisar e retornara em breve.',
          actorId: user?.sub ?? client.userId,
          emailSubject: 'Sua cotacao foi recebida',
        },
        tx,
      );

      await this.notificationsService.notifyRoles(
        [UserRole.COMERCIAL, UserRole.ADMIN],
        {
          ticketId: ticket.id,
          title: 'Nova cotacao recebida no CRM',
          message:
            'Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.',
          actorId: user?.sub ?? client.userId,
          emailSubject: 'Nova cotacao recebida no CRM',
          emailSummary: `${client.companyName ?? client.user.name} - ${dto.serviceType}`,
        },
        tx,
      );

      return createdQuote;
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.QUOTE,
      action: AuditLogAction.QUOTE_CREATED,
      message: `Cotacao criada para ${client.companyName ?? client.user.name}.`,
      targetType: 'Quote',
      targetId: quote.id,
      userId: user?.sub ?? client.userId,
      details: {
        clientId,
        serviceType: dto.serviceType,
        requestType: dto.requestType ?? null,
      },
    });

    return quote;
  }

  async findMine(clientId: string) {
    return this.prisma.quote.findMany({
      where: { clientId },
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
    });
  }

  async findAll(
    user: { sub: string; role: string },
    filters: { status?: string; clientId?: string },
  ) {
    this.ensureInternalUser(user);

    const where: {
      status?: QuoteStatus;
      clientId?: string;
    } = {};

    if (filters.status) {
      const isValidStatus = Object.values(QuoteStatus).includes(
        filters.status as QuoteStatus,
      );

      if (!isValidStatus) {
        throw new BadRequestException('Invalid quote status');
      }

      where.status = filters.status as QuoteStatus;
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    return this.prisma.quote.findMany({
      where,
      include: {
        client: {
          include: {
            user: true,
          },
        },
        history: {
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

  async findOne(user: { sub: string; role: string }, id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        history: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        client: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (user.role === 'CLIENTE' && quote.client.userId !== user.sub) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  async updateStatus(
    user: { sub: string; role: string },
    id: string,
    dto: UpdateQuoteStatusDto,
  ) {
    this.ensureInternalUser(user);
    await this.findOne(user, id);

    const updatedQuote = await this.prisma.quote.update({
      where: { id },
      data: {
        status: dto.status,
        history: {
          create: {
            status: dto.status,
            notes: dto.notes ?? `Status updated to ${dto.status}`,
          },
        },
      },
      include: {
        history: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.QUOTE,
      action: AuditLogAction.QUOTE_STATUS_CHANGED,
      message: `Status da cotacao alterado para ${dto.status}.`,
      targetType: 'Quote',
      targetId: id,
      userId: user.sub,
      details: {
        status: dto.status,
        notes: dto.notes ?? null,
      },
    });

    return updatedQuote;
  }

  async respond(
    user: { sub: string; role: string },
    id: string,
    dto: RespondQuoteDto,
  ) {
    this.ensureInternalUser(user);
    await this.findOne(user, id);

    const updatedQuote = await this.prisma.quote.update({
      where: { id },
      data: {
        price: dto.price,
        commercialNotes: dto.commercialNotes,
        status: QuoteStatus.ANSWERED,
        history: {
          create: {
            status: QuoteStatus.ANSWERED,
            notes: dto.commercialNotes ?? 'Commercial response sent',
          },
        },
      },
      include: {
        history: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        tickets: {
          include: {
            client: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (updatedQuote.tickets.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const ticket of updatedQuote.tickets) {
          const updatedTicket = await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              status: TicketStatus.AGUARDANDO_CLIENTE,
              requiresActionRole: UserRole.CLIENTE,
              lastInteractionAt: new Date(),
              messages: {
                create: {
                  senderType: MessageSenderType.INTERNO,
                  message:
                    dto.commercialNotes ??
                    `Proposta registrada no valor ${dto.price}.`,
                  createdById: user.sub,
                },
              },
              history: {
                create: {
                  eventType: TicketHistoryEventType.MESSAGE_SENT,
                  title: 'Proposta enviada ao cliente',
                  description: 'Resposta comercial registrada na cotacao.',
                  createdById: user.sub,
                },
              },
            },
            include: {
              client: {
                include: {
                  user: true,
                },
              },
            },
          });

          await this.notificationsService.notifyUsers(
            [updatedTicket.client?.userId],
            {
              ticketId: updatedTicket.id,
              title: 'Sua solicitacao foi respondida',
              message:
                'Nossa equipe respondeu sua solicitacao. Acesse o ticket para visualizar a devolutiva.',
              actorId: user.sub,
              emailSubject: 'Sua solicitacao foi respondida',
              emailSummary:
                dto.commercialNotes ??
                `Proposta registrada no valor ${dto.price}.`,
            },
            tx,
          );
        }
      });
    }

    await this.auditLogsService.create({
      category: AuditLogCategory.QUOTE,
      action: AuditLogAction.QUOTE_RESPONDED,
      message: 'Proposta comercial enviada para cotacao.',
      targetType: 'Quote',
      targetId: id,
      userId: user.sub,
      details: {
        price: dto.price,
      },
    });

    return updatedQuote;
  }
}
