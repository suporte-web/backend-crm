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
  ProspectStatusCadastral,
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
import { CreateInternalQuoteDto } from './dto/create-internal-quote.dto';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { RespondQuoteDto } from './dto/respond-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private buildQuoteInclude() {
    return {
      client: {
        include: {
          user: true,
        },
      },
      prospect: true,
      history: {
        orderBy: {
          createdAt: 'desc' as const,
        },
      },
      tickets: {
        include: {
          client: {
            include: {
              user: true,
            },
          },
          prospect: true,
        },
      },
      propostas: {
        orderBy: [
          {
            versao: 'desc' as const,
          },
          {
            updatedAt: 'desc' as const,
          },
        ],
      },
    };
  }

  private isInternalUser(user: { role: string }) {
    return ['ADMIN', 'GESTAO', 'COMERCIAL'].includes(user.role);
  }

  private sanitize(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private parseOptionalDate(value?: string | null) {
    const sanitized = this.sanitize(value);

    if (!sanitized) {
      return null;
    }

    const date = new Date(sanitized);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private formatQuoteStatus(status: QuoteStatus) {
    const labels: Record<QuoteStatus, string> = {
      RECEIVED: 'Recebida',
      IN_ANALYSIS: 'Em análise',
      ANSWERED: 'Respondida',
      APPROVED: 'Aprovada',
      REJECTED: 'Rejeitada',
    };

    return labels[status];
  }

  private getQuoteRequesterName(quote: {
    client?: {
      companyName?: string | null;
      user?: { name: string } | null;
    } | null;
    prospect?: { nomeRazaoSocial: string } | null;
  }) {
    return (
      quote.client?.companyName ??
      quote.client?.user?.name ??
      quote.prospect?.nomeRazaoSocial ??
      'Prospect'
    );
  }

  private generateDisplayCode(prefix: 'COT' | 'PROP', source: string) {
    let hash = 0;

    for (const char of source) {
      hash = (hash * 31 + char.charCodeAt(0)) % 1000000;
    }

    return `${prefix}-${String(hash).padStart(6, '0')}`;
  }

  private ensureInternalUser(user: { sub: string; role: string }) {
    const allowedRoles = ['ADMIN', 'GESTAO', 'COMERCIAL'];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Você não tem permissão para executar esta ação.',
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
      throw new NotFoundException('Cliente não encontrado.');
    }

    const shouldCreatePreContract =
      dto.requestType?.toLowerCase().includes('contrato') ?? false;

    const quote = await this.prisma.$transaction(async (tx) => {
      const createdQuote = await tx.quote.create({
        data: {
          code: `TMP-${Date.now()}`,
          clientId,
          origin: dto.origin,
          destination: dto.destination,
          serviceType: dto.serviceType,
          requestType: this.sanitize(dto.requestType),
          pickupAddress: this.sanitize(dto.pickupAddress),
          deliveryAddress: this.sanitize(dto.deliveryAddress),
          cargoDescription: this.sanitize(dto.cargoDescription),
          contactName: this.sanitize(dto.contactName),
          contactPhone: this.sanitize(dto.contactPhone),
          contactEmail: this.sanitize(dto.contactEmail),
          weight: dto.weight,
          volume: dto.volume,
          quantity: dto.quantity,
          merchandiseValue:
            dto.merchandiseValue !== undefined
              ? dto.merchandiseValue
              : undefined,
          desiredDeadline: this.sanitize(dto.desiredDeadline),
          notes: this.sanitize(dto.notes),
          history: {
            create: {
              status: QuoteStatus.RECEIVED,
              notes: 'Cotação criada pelo cliente',
            },
          },
        },
        include: {
          ...this.buildQuoteInclude(),
        },
      });

      const quoteCode = this.generateDisplayCode('COT', createdQuote.id);
      const quoteWithCode = await tx.quote.update({
        where: { id: createdQuote.id },
        data: {
          code: quoteCode,
        },
        include: {
          ...this.buildQuoteInclude(),
        },
      });

      const opportunity = await tx.opportunity.create({
        data: {
          clientId,
          quoteId: createdQuote.id,
          title: shouldCreatePreContract
            ? `Pre-contrato - ${dto.serviceType}`
            : `Cotação - ${dto.serviceType}`,
          stage: OpportunityStage.NOVO,
          preContract: shouldCreatePreContract,
          preContractNotes: shouldCreatePreContract
            ? 'Pré-contrato criado automaticamente a partir da cotação do cliente.'
            : undefined,
        },
      });

      await tx.timelineEvent.create({
        data: {
          clientId,
          type: TimelineEventType.OPPORTUNITY_CREATED,
          title: 'Oportunidade criada pela cotação',
          description: `Cotação ${createdQuote.serviceType} entrou no pipeline comercial.`,
          createdById: user?.sub,
          metadata: {
            quoteId: createdQuote.id,
            quoteCode,
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
                `Cotação criada para ${dto.serviceType}: ${dto.origin} -> ${dto.destination}.`,
              createdById: user?.sub,
            },
          },
          history: {
            create: {
              eventType: TicketHistoryEventType.CREATED,
              title: 'Cotação recebida',
              description:
                'Ticket criado automaticamente a partir da cotação do cliente.',
              createdById: user?.sub ?? client.userId,
            },
          },
        },
      });

      await this.notificationsService.notifyUsers(
        [client.userId],
        {
          ticketId: ticket.id,
          title: 'Sua cotação foi recebida',
          message:
            'Sua cotação foi enviada com sucesso. Nossa equipe comercial irá analisar e retornará em breve.',
          actorId: user?.sub ?? client.userId,
          emailSubject: 'Sua cotação foi recebida',
        },
        tx,
      );

      await this.notificationsService.notifyRoles(
        [UserRole.COMERCIAL, UserRole.ADMIN],
        {
          ticketId: ticket.id,
          title: 'Nova cotação recebida no CRM',
          message:
            'Nova cotação recebida. Acesse o ticket para iniciar o atendimento.',
          actorId: user?.sub ?? client.userId,
          emailSubject: 'Nova cotação recebida no CRM',
          emailSummary: `${client.companyName ?? client.user.name} - ${dto.serviceType}`,
        },
        tx,
      );

      return quoteWithCode;
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.QUOTE,
      action: AuditLogAction.QUOTE_CREATED,
      message: `Cotação criada para ${client.companyName ?? client.user.name}.`,
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

  async createInternal(
    user: { sub: string; role: string },
    dto: CreateInternalQuoteDto,
  ) {
    this.ensureInternalUser(user);

    if (dto.clientId && dto.prospectId) {
      throw new BadRequestException(
        'Informe clientId ou prospectId, nÃ£o os dois.',
      );
    }

    if (!dto.clientId && !dto.prospectId) {
      throw new BadRequestException(
        'Informe um cliente ou prospect para criar a cotaÃ§Ã£o.',
      );
    }

    const [client, prospect] = await Promise.all([
      dto.clientId
        ? this.prisma.client.findUnique({
            where: { id: dto.clientId },
            include: { user: true },
          })
        : null,
      dto.prospectId
        ? this.prisma.prospect.findUnique({
            where: { id: dto.prospectId },
          })
        : null,
    ]);

    if (dto.clientId && !client) {
      throw new NotFoundException('Cliente nÃ£o encontrado.');
    }

    if (dto.prospectId && !prospect) {
      throw new NotFoundException('Prospect nÃ£o encontrado.');
    }

    const origin = this.sanitize(dto.origin);
    const destination = this.sanitize(dto.destination);
    const serviceType = this.sanitize(dto.serviceType);

    if (!origin || !destination || !serviceType) {
      throw new BadRequestException(
        'Informe origem, destino e tipo de serviÃ§o da cotaÃ§Ã£o.',
      );
    }

    const requesterName =
      client?.companyName ??
      client?.user?.name ??
      prospect?.nomeRazaoSocial ??
      'Prospect';

    const quote = await this.prisma.$transaction(async (tx) => {
      const createdQuote = await tx.quote.create({
        data: {
          code: `TMP-${Date.now()}`,
          clientId: client?.id,
          prospectId: prospect?.id,
          origin,
          destination,
          serviceType,
          requestType: this.sanitize(dto.requestType),
          pickupAddress: this.sanitize(dto.pickupAddress),
          deliveryAddress: this.sanitize(dto.deliveryAddress),
          cargoDescription: this.sanitize(dto.cargoDescription),
          contactName:
            this.sanitize(dto.contactName) ??
            client?.user?.name ??
            prospect?.nomeContato,
          contactPhone:
            this.sanitize(dto.contactPhone) ??
            client?.phone ??
            prospect?.telefone,
          contactEmail:
            this.sanitize(dto.contactEmail) ??
            client?.user?.email ??
            prospect?.email,
          weight: dto.weight,
          volume: dto.volume,
          quantity: dto.quantity,
          merchandiseValue:
            dto.merchandiseValue !== undefined
              ? dto.merchandiseValue
              : undefined,
          desiredDeadline: this.sanitize(dto.desiredDeadline),
          notes: this.sanitize(dto.notes),
          history: {
            create: {
              status: QuoteStatus.RECEIVED,
              notes: 'Cotação criada pela equipe comercial.',
            },
          },
        },
      });

      const quoteCode = this.generateDisplayCode('COT', createdQuote.id);

      await tx.quote.update({
        where: { id: createdQuote.id },
        data: {
          code: quoteCode,
        },
      });

      let opportunityId: string | undefined;

      if (client) {
        const opportunity = await tx.opportunity.create({
          data: {
            clientId: client.id,
            quoteId: createdQuote.id,
            title: `Cotacao - ${serviceType}`,
            stage: OpportunityStage.NOVO,
          },
        });
        opportunityId = opportunity.id;

        await tx.timelineEvent.create({
          data: {
            clientId: client.id,
            type: TimelineEventType.OPPORTUNITY_CREATED,
            title: 'Oportunidade criada pela cotaÃ§Ã£o',
            description: `Cotacao ${serviceType} criada pela equipe comercial.`,
            createdById: user.sub,
            metadata: {
              quoteId: createdQuote.id,
              quoteCode,
              opportunityId,
              source: 'internal_commercial',
            },
          },
        });
      }

      await tx.ticket.create({
        data: {
          clientId: client?.id,
          prospectId: prospect?.id,
          quoteId: createdQuote.id,
          opportunityId,
          requesterId: user.sub,
          type: TicketType.COTACAO,
          status: TicketStatus.COTACAO_CRIADA,
          requiresActionRole: UserRole.COMERCIAL,
          internalOnly: Boolean(prospect && !client),
          lastInteractionAt: new Date(),
          subject: `Cotacao criada: ${serviceType}`,
          description: `${requesterName} possui cotacao de ${origin} para ${destination}.`,
          messages: {
            create: {
              senderType: MessageSenderType.INTERNO,
              message:
                this.sanitize(dto.notes) ??
                `Cotacao criada para ${serviceType}: ${origin} -> ${destination}.`,
              isInternal: Boolean(prospect && !client),
              createdById: user.sub,
            },
          },
          history: {
            create: {
              eventType: TicketHistoryEventType.CREATED,
              title: 'Cotação criada',
              description: 'Cotação criada pela equipe comercial qualificação.',
              internalOnly: Boolean(prospect && !client),
              createdById: user.sub,
              metadata: {
                quoteId: createdQuote.id,
                quoteCode,
                clientId: client?.id ?? null,
                prospectId: prospect?.id ?? null,
              },
            },
          },
        },
      });

      return tx.quote.findUniqueOrThrow({
        where: { id: createdQuote.id },
        include: {
          ...this.buildQuoteInclude(),
        },
      });
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.QUOTE,
      action: AuditLogAction.QUOTE_CREATED,
      message: `Cotacao ${quote.code} criada pela equipe comercial.`,
      targetType: 'Quote',
      targetId: quote.id,
      userId: user.sub,
      details: {
        clientId: client?.id ?? null,
        prospectId: prospect?.id ?? null,
        serviceType,
      },
    });

    return quote;
  }

  async findMine(clientId: string) {
    return this.prisma.quote.findMany({
      where: { clientId },
      include: {
        ...this.buildQuoteInclude(),
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
        throw new BadRequestException('Status da cotação invalido.');
      }

      where.status = filters.status as QuoteStatus;
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    return this.prisma.quote.findMany({
      where,
      include: {
        ...this.buildQuoteInclude(),
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
        ...this.buildQuoteInclude(),
      },
    });

    if (!quote) {
      throw new NotFoundException('Cotação não encontrada.');
    }

    if (user.role === 'CLIENTE' && quote.client?.userId !== user.sub) {
      throw new NotFoundException('Cotação não encontrada.');
    }

    return quote;
  }

  async update(
    user: { sub: string; role: string },
    id: string,
    dto: UpdateQuoteDto,
  ) {
    const quote = await this.findOne(user, id);
    const isClientOwner =
      user.role === 'CLIENTE' && quote.client?.userId === user.sub;
    const editableStatuses: QuoteStatus[] = [
      QuoteStatus.RECEIVED,
      QuoteStatus.IN_ANALYSIS,
    ];
    const canClientEdit =
      isClientOwner && editableStatuses.includes(quote.status);

    if (!this.isInternalUser({ role: user.role }) && !canClientEdit) {
      throw new ForbiddenException('Você não pode editar esta cotação.');
    }

    const changedFields = [
      dto.origin !== undefined && dto.origin !== quote.origin ? 'origem' : null,
      dto.destination !== undefined && dto.destination !== quote.destination
        ? 'destino'
        : null,
      dto.serviceType !== undefined && dto.serviceType !== quote.serviceType
        ? 'tipo de serviço'
        : null,
      dto.requestType !== undefined &&
      this.sanitize(dto.requestType) !== quote.requestType
        ? 'tipo de solicitação'
        : null,
      dto.pickupAddress !== undefined &&
      this.sanitize(dto.pickupAddress) !== quote.pickupAddress
        ? 'endereco de coleta'
        : null,
      dto.deliveryAddress !== undefined &&
      this.sanitize(dto.deliveryAddress) !== quote.deliveryAddress
        ? 'endereco de entrega'
        : null,
      dto.cargoDescription !== undefined &&
      this.sanitize(dto.cargoDescription) !== quote.cargoDescription
        ? 'descrição da carga'
        : null,
      dto.contactName !== undefined &&
      this.sanitize(dto.contactName) !== quote.contactName
        ? 'contato'
        : null,
      dto.contactPhone !== undefined &&
      this.sanitize(dto.contactPhone) !== quote.contactPhone
        ? 'telefone'
        : null,
      dto.contactEmail !== undefined &&
      this.sanitize(dto.contactEmail) !== quote.contactEmail
        ? 'e-mail'
        : null,
      dto.weight !== undefined && dto.weight !== quote.weight ? 'peso' : null,
      dto.volume !== undefined && dto.volume !== quote.volume ? 'volume' : null,
      dto.quantity !== undefined && dto.quantity !== quote.quantity
        ? 'quantidade'
        : null,
      dto.merchandiseValue !== undefined &&
      String(dto.merchandiseValue ?? '') !==
        String(quote.merchandiseValue ?? '')
        ? 'valor da mercadoria'
        : null,
      dto.desiredDeadline !== undefined &&
      String(dto.desiredDeadline ?? '') !== String(quote.desiredDeadline ?? '')
        ? 'prazo desejado'
        : null,
      dto.notes !== undefined && this.sanitize(dto.notes) !== quote.notes
        ? 'observacoes'
        : null,
    ].filter(Boolean);

    const updatedQuote = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.quote.update({
        where: { id },
        data: {
          origin: dto.origin,
          destination: dto.destination,
          serviceType: dto.serviceType,
          requestType:
            dto.requestType !== undefined
              ? this.sanitize(dto.requestType)
              : undefined,
          pickupAddress:
            dto.pickupAddress !== undefined
              ? this.sanitize(dto.pickupAddress)
              : undefined,
          deliveryAddress:
            dto.deliveryAddress !== undefined
              ? this.sanitize(dto.deliveryAddress)
              : undefined,
          cargoDescription:
            dto.cargoDescription !== undefined
              ? this.sanitize(dto.cargoDescription)
              : undefined,
          contactName:
            dto.contactName !== undefined
              ? this.sanitize(dto.contactName)
              : undefined,
          contactPhone:
            dto.contactPhone !== undefined
              ? this.sanitize(dto.contactPhone)
              : undefined,
          contactEmail:
            dto.contactEmail !== undefined
              ? this.sanitize(dto.contactEmail)
              : undefined,
          weight: dto.weight,
          volume: dto.volume,
          quantity: dto.quantity,
          merchandiseValue: dto.merchandiseValue,
          desiredDeadline:
            dto.desiredDeadline !== undefined
              ? this.sanitize(dto.desiredDeadline)
              : undefined,
          notes: dto.notes !== undefined ? this.sanitize(dto.notes) : undefined,
          history: {
            create: {
              status: quote.status,
              notes: `Cotacao editada por ${user.role === 'CLIENTE' ? 'cliente' : 'equipe interna'}.`,
            },
          },
        },
        include: {
          ...this.buildQuoteInclude(),
        },
      });

      if (changedFields.length > 0) {
        await tx.ticket.updateMany({
          where: { quoteId: id },
          data: {
            subject: `Nova cotacao: ${updated.serviceType}`,
            description: `${this.getQuoteRequesterName(
              updated,
            )} enviou cotacao de ${updated.origin} para ${
              updated.destination
            }.`,
            lastInteractionAt: new Date(),
          },
        });

        if (updated.tickets.length > 0) {
          await tx.ticketHistory.createMany({
            data: updated.tickets.map((ticket) => ({
              ticketId: ticket.id,
              eventType: TicketHistoryEventType.STATUS_CHANGED,
              title: 'Cotação editada',
              description: `Campos atualizados: ${changedFields.join(', ')}.`,
              createdById: user.sub,
              metadata: {
                quoteId: id,
                quoteCode: updated.code,
                changedFields,
              },
            })),
          });
        }

        if (
          dto.serviceType !== undefined ||
          dto.desiredDeadline !== undefined
        ) {
          await tx.opportunity.updateMany({
            where: { quoteId: id },
            data: {
              ...(dto.serviceType !== undefined
                ? { title: `Cotacao - ${updated.serviceType}` }
                : {}),
              ...(dto.desiredDeadline !== undefined
                ? {
                    expectedCloseDate: this.parseOptionalDate(
                      dto.desiredDeadline,
                    ),
                  }
                : {}),
            },
          });
        }
      }

      return updated;
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.QUOTE,
      action: AuditLogAction.CUSTOM,
      message: `Cotacao ${updatedQuote.code} editada.`,
      targetType: 'Quote',
      targetId: id,
      userId: user.sub,
      details: {
        changedFields,
      },
    });

    return updatedQuote;
  }

  async updateStatus(
    user: { sub: string; role: string },
    id: string,
    dto: UpdateQuoteStatusDto,
  ) {
    this.ensureInternalUser(user);
    const quote = await this.findOne(user, id);

    const updatedQuote = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.quote.update({
        where: { id },
        data: {
          status: dto.status,
          history: {
            create: {
              status: dto.status,
              notes:
                dto.notes ??
                `Status atualizado para ${this.formatQuoteStatus(dto.status)}.`,
            },
          },
        },
        include: {
          ...this.buildQuoteInclude(),
        },
      });

      if (dto.status === QuoteStatus.APPROVED && quote.prospectId) {
        await tx.prospect.update({
          where: { id: quote.prospectId },
          data: {
            statusCadastral: ProspectStatusCadastral.AGUARDANDO_CADASTRO,
          },
        });

        if (updated.tickets.length > 0) {
          await tx.ticketHistory.createMany({
            data: updated.tickets.map((ticket) => ({
              ticketId: ticket.id,
              eventType: TicketHistoryEventType.STATUS_CHANGED,
              title: 'Prospect aguardando cadastro',
              description:
                'Cotação aprovada. O prospect precisa completar cadastro antes de contrato, operação, entrega ou rastreamento.',
              createdById: user.sub,
              internalOnly: true,
              metadata: {
                quoteId: id,
                prospectId: quote.prospectId,
                statusCadastral: ProspectStatusCadastral.AGUARDANDO_CADASTRO,
              },
            })),
          });
        }
      }

      return updated;
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.QUOTE,
      action: AuditLogAction.QUOTE_STATUS_CHANGED,
      message: `Status da cotacao alterado para ${this.formatQuoteStatus(dto.status)}.`,
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
        commercialNotes: this.sanitize(dto.commercialNotes),
        status: QuoteStatus.ANSWERED,
        history: {
          create: {
            status: QuoteStatus.ANSWERED,
            notes: dto.commercialNotes ?? 'Resposta comercial enviada',
          },
        },
      },
      include: {
        ...this.buildQuoteInclude(),
      },
    });

    await this.prisma.opportunity.updateMany({
      where: { quoteId: id },
      data: {
        value: dto.price,
        stage: OpportunityStage.PROPOSTA,
      },
    });

    if (updatedQuote.tickets.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const ticket of updatedQuote.tickets) {
          const hasClientUser = Boolean(ticket.client?.userId);
          const prospectFlow = Boolean(
            updatedQuote.prospectId && !hasClientUser,
          );
          const updatedTicket = await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              status: prospectFlow
                ? TicketStatus.COTACAO_CRIADA
                : TicketStatus.AGUARDANDO_CLIENTE,
              requiresActionRole: prospectFlow
                ? UserRole.COMERCIAL
                : UserRole.CLIENTE,
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
                  title: prospectFlow
                    ? 'Resposta comercial registrada'
                    : 'Proposta enviada ao cliente',
                  description: prospectFlow
                    ? 'Resposta comercial registrada para cotação de prospect. O cadastro precisa ser concluído antes de contrato.'
                    : 'Resposta comercial registrada na cotação.',
                  createdById: user.sub,
                  internalOnly: prospectFlow,
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

          if (updatedTicket.client?.userId) {
            await this.notificationsService.notifyUsers(
              [updatedTicket.client.userId],
              {
                ticketId: updatedTicket.id,
                title: 'Sua solicitação foi respondida',
                message:
                  'Nossa equipe respondeu sua solicitação. Acesse o ticket para visualizar a devolutiva.',
                actorId: user.sub,
                emailSubject: 'Sua solicitação foi respondida',
                emailSummary:
                  this.sanitize(dto.commercialNotes) ??
                  `Proposta registrada no valor ${dto.price}.`,
              },
              tx,
            );
          }
        }
      });
    }

    await this.auditLogsService.create({
      category: AuditLogCategory.QUOTE,
      action: AuditLogAction.QUOTE_RESPONDED,
      message: 'Proposta comercial enviada para cotação.',
      targetType: 'Quote',
      targetId: id,
      userId: user.sub,
      details: {
        price: dto.price,
      },
    });

    return updatedQuote;
  }

  async remove(user: { sub: string; role: string }, id: string) {
    const quote = await this.findOne(user, id);
    const isClientOwner =
      user.role === 'CLIENTE' && quote.client?.userId === user.sub;
    const deletableStatuses: QuoteStatus[] = [
      QuoteStatus.RECEIVED,
      QuoteStatus.IN_ANALYSIS,
    ];
    const canClientDelete =
      isClientOwner && deletableStatuses.includes(quote.status);

    if (!this.isInternalUser({ role: user.role }) && !canClientDelete) {
      throw new ForbiddenException('Você não pode excluir esta cotação.');
    }

    await this.prisma.quote.delete({
      where: { id },
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.QUOTE,
      action: AuditLogAction.QUOTE_DELETED,
      message: `Cotacao ${quote.code} excluida.`,
      targetType: 'Quote',
      targetId: id,
      userId: user.sub,
      details: {
        quoteId: id,
        quoteCode: quote.code,
        clientId: quote.clientId,
        clientName:
          quote.client?.companyName ?? quote.client?.user?.name ?? null,
        clientEmail: quote.client?.user?.email ?? null,
        previousStatus: quote.status,
        serviceType: quote.serviceType,
      },
    });

    return { message: 'Cotação excluida com sucesso.' };
  }
}
