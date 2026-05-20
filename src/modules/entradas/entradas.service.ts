import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditLogAction,
  AuditLogCategory,
  EntradaOrigem,
  MessageSenderType,
  Prisma,
  ProspectPortalAccessStatus,
  ProspectStatusCadastral,
  QuoteStatus,
  TicketHistoryEventType,
  TicketPriority,
  TicketStatus,
  TicketType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateEntradaQuoteDto } from './dto/create-entrada-quote.dto';
import { CreateSiteTicketDto } from './dto/create-site-ticket.dto';
import { EntradaNoteDto, TransferEntradaDto } from './dto/entrada-actions.dto';
import { LinkProspectDto } from './dto/link-prospect.dto';

type EntradaFilters = {
  status?: string;
  tipo?: string;
  responsavelId?: string;
  origem?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
};

@Injectable()
export class EntradasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private entradaListInclude(): Prisma.TicketInclude {
    return {
      client: {
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
      },
      prospect: true,
      quote: {
        include: {
          client: {
            include: {
              user: true,
            },
          },
          prospect: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    };
  }

  private entradaDetailInclude(): Prisma.TicketInclude {
    return {
      ...this.entradaListInclude(),
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      messages: {
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

  private sanitize(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private normalizeKey(value?: string | null) {
    return this.sanitize(value)
      ?.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
  }

  private normalizeOrigin(value?: string | null) {
    const key = this.normalizeKey(value) ?? EntradaOrigem.SITE;

    if (!Object.values(EntradaOrigem).includes(key as EntradaOrigem)) {
      throw new BadRequestException('Origem da entrada invalida.');
    }

    return key as EntradaOrigem;
  }

  private normalizeTicketType(value?: string | null) {
    const key = this.normalizeKey(value) ?? TicketType.COTACAO;

    if (!Object.values(TicketType).includes(key as TicketType)) {
      throw new BadRequestException('Tipo da entrada invalido.');
    }

    return key as TicketType;
  }

  private normalizePriority(value?: string | null) {
    const key = this.normalizeKey(value) ?? TicketPriority.NORMAL;

    if (!Object.values(TicketPriority).includes(key as TicketPriority)) {
      throw new BadRequestException('Prioridade da entrada invalida.');
    }

    return key as TicketPriority;
  }

  private normalizeStatus(value?: string | null) {
    const key = this.normalizeKey(value);

    if (!key) {
      return undefined;
    }

    if (!Object.values(TicketStatus).includes(key as TicketStatus)) {
      throw new BadRequestException('Status da entrada invalido.');
    }

    return key as TicketStatus;
  }

  private ensureCanAccess(user: { role: string }) {
    if (!['ADMIN', 'GESTAO', 'COMERCIAL'].includes(user.role)) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar a Central de Entradas.',
      );
    }
  }

  private ensureCanManage(user: AuthUser) {
    if (!['ADMIN', 'GESTAO', 'COMERCIAL'].includes(user.role)) {
      throw new ForbiddenException(
        'Você não tem permissão para executar esta ação.',
      );
    }
  }

  private assertCommercialCanHandle(
    user: { sub: string; role: string },
    ticket: { type: TicketType; assignedToId?: string | null },
  ) {
    if (user.role !== 'COMERCIAL') {
      return;
    }

    if (
      ticket.type === TicketType.COTACAO ||
      ticket.assignedToId === user.sub
    ) {
      return;
    }

    throw new ForbiddenException(
      'Comercial pode acessar entradas de cotação ou atribuídas a ele.',
    );
  }

  private parseDateStart(value?: string) {
    if (!value) {
      return undefined;
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private parseDateEnd(value?: string) {
    if (!value) {
      return undefined;
    }

    const date = new Date(`${value}T23:59:59.999Z`);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private generateDisplayCode(prefix: 'ENT' | 'COT', source: string) {
    let hash = 0;

    for (const char of source) {
      hash = (hash * 31 + char.charCodeAt(0)) % 1000000;
    }

    return `${prefix}-${String(hash).padStart(6, '0')}`;
  }

  private getPayloadValue(
    payload: Prisma.JsonValue | null | undefined,
    keys: string[],
  ) {
    if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
      return null;
    }

    const record = payload as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }

      if (typeof value === 'number') {
        return String(value);
      }
    }

    return null;
  }

  private buildCandidateCriteria(ticket: {
    emailSolicitante?: string | null;
    telefoneSolicitante?: string | null;
    formPayload?: Prisma.JsonValue | null;
  }) {
    const email = this.sanitize(
      ticket.emailSolicitante ??
        this.getPayloadValue(ticket.formPayload, ['email', 'e-mail']),
    );
    const telefone = this.sanitize(
      ticket.telefoneSolicitante ??
        this.getPayloadValue(ticket.formPayload, ['telefone', 'phone']),
    );
    const document = this.sanitize(
      this.getPayloadValue(ticket.formPayload, [
        'cnpj',
        'cpfCnpj',
        'document',
        'documento',
      ]),
    );

    return { email, telefone, document };
  }

  private buildTextSearchWhere(query: string): Prisma.TicketWhereInput {
    return {
      OR: [
        { protocolo: { contains: query, mode: 'insensitive' } },
        { subject: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { nomeSolicitante: { contains: query, mode: 'insensitive' } },
        { emailSolicitante: { contains: query, mode: 'insensitive' } },
        { telefoneSolicitante: { contains: query, mode: 'insensitive' } },
        {
          prospect: {
            is: {
              nomeRazaoSocial: { contains: query, mode: 'insensitive' },
            },
          },
        },
        {
          client: {
            is: {
              companyName: { contains: query, mode: 'insensitive' },
            },
          },
        },
      ],
    };
  }

  private buildWhere(
    user: { sub: string; role: string },
    filters: EntradaFilters,
  ) {
    const status = this.normalizeStatus(filters.status);
    const tipo = filters.tipo
      ? this.normalizeTicketType(filters.tipo)
      : undefined;
    const origem = this.normalizeOrigin(filters.origem ?? EntradaOrigem.SITE);
    const createdAt: Prisma.DateTimeFilter = {};
    const dateFrom = this.parseDateStart(filters.dateFrom);
    const dateTo = this.parseDateEnd(filters.dateTo);
    const and: Prisma.TicketWhereInput[] = [
      {
        origem,
      },
    ];

    if (dateFrom) {
      createdAt.gte = dateFrom;
    }

    if (dateTo) {
      createdAt.lte = dateTo;
    }

    if (Object.keys(createdAt).length > 0) {
      and.push({ createdAt });
    }

    if (status) {
      and.push({ status });
    }

    if (tipo) {
      and.push({ type: tipo });
    }

    if (filters.responsavelId) {
      and.push({ assignedToId: filters.responsavelId });
    }

    if (filters.q?.trim()) {
      and.push(this.buildTextSearchWhere(filters.q.trim()));
    }

    if (user.role === 'COMERCIAL') {
      and.push({
        OR: [
          { type: TicketType.COTACAO },
          { assignedToId: user.sub },
          { assignedToId: null },
        ],
      });
    }

    return { AND: and };
  }

  async createFromSite(dto: CreateSiteTicketDto) {
    const nomeSolicitante = this.sanitize(dto.nomeSolicitante);
    const emailSolicitante = this.sanitize(dto.emailSolicitante);
    const telefoneSolicitante = this.sanitize(dto.telefoneSolicitante);
    const mensagem = this.sanitize(dto.mensagem);
    const type = this.normalizeTicketType(dto.tipo);

    if (!nomeSolicitante) {
      throw new BadRequestException('Informe o nome do solicitante.');
    }

    if (!emailSolicitante && !telefoneSolicitante) {
      throw new BadRequestException(
        'Informe e-mail ou telefone do solicitante.',
      );
    }

    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: {
          origem: EntradaOrigem.SITE,
          prioridade: this.normalizePriority(dto.prioridade),
          type,
          status: TicketStatus.NOVO,
          requiresActionRole: UserRole.COMERCIAL,
          internalOnly: true,
          nomeSolicitante,
          emailSolicitante,
          telefoneSolicitante,
          mensagem,
          formPayload:
            dto.formPayload === undefined
              ? undefined
              : (dto.formPayload as Prisma.InputJsonValue),
          subject: `Entrada do site: ${nomeSolicitante}`,
          description:
            mensagem ?? `Solicitação recebida pelo formulario publico do site.`,
          lastInteractionAt: new Date(),
          messages: {
            create: {
              senderType: MessageSenderType.CLIENTE,
              message:
                mensagem ??
                `Solicitação recebida pelo formulario publico do site.`,
              isInternal: true,
            },
          },
          history: {
            create: {
              eventType: TicketHistoryEventType.CREATED,
              title: 'Ticket de entrada criado',
              description:
                'Entrada criada automaticamente a partir do formulario publico do site.',
              internalOnly: true,
            },
          },
        },
        include: this.entradaDetailInclude(),
      });
      const protocolo = this.generateDisplayCode('ENT', created.id);

      return tx.ticket.update({
        where: { id: created.id },
        data: { protocolo },
        include: this.entradaDetailInclude(),
      });
    });

    await this.notificationsService.notifyRoles(
      [UserRole.COMERCIAL, UserRole.ADMIN],
      {
        ticketId: ticket.id,
        title: 'Nova entrada recebida pelo site',
        message: `${nomeSolicitante} enviou uma solicitacao pelo site.`,
        link: `/entradas/${ticket.id}`,
        emailSubject: 'Nova entrada recebida pelo site',
      },
    );

    await this.auditLogsService.create({
      category: AuditLogCategory.TICKET,
      action: AuditLogAction.TICKET_CREATED,
      message: `Entrada do site criada para ${nomeSolicitante}.`,
      targetType: 'Ticket',
      targetId: ticket.id,
      details: {
        protocolo: ticket.protocolo,
        origem: EntradaOrigem.SITE,
        type,
      },
    });

    return ticket;
  }

  async findAll(user: AuthUser, filters: EntradaFilters) {
    this.ensureCanAccess(user);

    return this.prisma.ticket.findMany({
      where: this.buildWhere(user, filters),
      include: this.entradaListInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(user: AuthUser, id: string) {
    this.ensureCanAccess(user);

    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id,
        origem: {
          not: null,
        },
      },
      include: this.entradaDetailInclude(),
    });

    if (!ticket) {
      throw new NotFoundException('Entrada não encontrada.');
    }

    this.assertCommercialCanHandle(user, ticket);

    return ticket;
  }

  async assumir(user: AuthUser, id: string) {
    this.ensureCanManage(user);
    const ticket = await this.findOne(user, id);
    const initialStatuses: TicketStatus[] = [
      TicketStatus.NOVO,
      TicketStatus.ABERTO,
      TicketStatus.NEW,
    ];
    const nextStatus = initialStatuses.includes(ticket.status)
      ? TicketStatus.EM_ANDAMENTO
      : ticket.status;

    return this.prisma.ticket.update({
      where: { id },
      data: {
        assignedToId: user.sub,
        status: nextStatus,
        requiresActionRole: UserRole.COMERCIAL,
        lastInteractionAt: new Date(),
        history: {
          create: {
            eventType: TicketHistoryEventType.STATUS_CHANGED,
            title: 'Entrada assumida',
            description: 'Comercial assumiu o atendimento da entrada.',
            createdById: user.sub,
            internalOnly: true,
          },
        },
      },
      include: this.entradaDetailInclude(),
    });
  }

  async findProspectSuggestions(user: AuthUser, id: string) {
    const ticket = await this.findOne(user, id);
    const criteria = this.buildCandidateCriteria(ticket);
    const prospectOr: Prisma.ProspectWhereInput[] = [];
    const clientOr: Prisma.ClientWhereInput[] = [];

    if (criteria.email) {
      prospectOr.push({
        email: { equals: criteria.email, mode: 'insensitive' },
      });
      clientOr.push({
        user: { email: { equals: criteria.email, mode: 'insensitive' } },
      });
    }

    if (criteria.telefone) {
      prospectOr.push({
        telefone: { contains: criteria.telefone, mode: 'insensitive' },
      });
      clientOr.push({
        phone: { contains: criteria.telefone, mode: 'insensitive' },
      });
    }

    if (criteria.document) {
      prospectOr.push({
        document: { equals: criteria.document, mode: 'insensitive' },
      });
      clientOr.push({
        document: { equals: criteria.document, mode: 'insensitive' },
      });
    }

    const [prospects, clients] = await Promise.all([
      prospectOr.length
        ? this.prisma.prospect.findMany({
            where: { OR: prospectOr },
            orderBy: { updatedAt: 'desc' },
            take: 10,
          })
        : [],
      clientOr.length
        ? this.prisma.client.findMany({
            where: { OR: clientOr },
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
            orderBy: { updatedAt: 'desc' },
            take: 10,
          })
        : [],
    ]);

    return {
      criteria,
      prospects,
      clients,
    };
  }

  async linkOrCreateProspect(user: AuthUser, id: string, dto: LinkProspectDto) {
    this.ensureCanManage(user);
    const ticket = await this.findOne(user, id);

    if (dto.prospectId && dto.clientId) {
      throw new BadRequestException(
        'Informe prospectId ou clientId, não os dois.',
      );
    }

    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.clientId },
      });

      if (!client) {
        throw new NotFoundException('Cliente não encontrado.');
      }

      return this.prisma.ticket.update({
        where: { id },
        data: {
          clientId: client.id,
          prospectId: null,
          status: TicketStatus.CONVERTIDO_EM_PROSPECT,
          requiresActionRole: UserRole.COMERCIAL,
          lastInteractionAt: new Date(),
          history: {
            create: {
              eventType: TicketHistoryEventType.STATUS_CHANGED,
              title: 'Cliente ativo vinculado',
              description:
                'Entrada vinculada manualmente a um cliente ativo existente.',
              createdById: user.sub,
              internalOnly: true,
              metadata: {
                clientId: client.id,
              },
            },
          },
        },
        include: this.entradaDetailInclude(),
      });
    }

    if (dto.prospectId) {
      const prospect = await this.prisma.prospect.findUnique({
        where: { id: dto.prospectId },
      });

      if (!prospect) {
        throw new NotFoundException('Prospect não encontrado.');
      }

      return this.prisma.ticket.update({
        where: { id },
        data: {
          prospectId: prospect.id,
          status: TicketStatus.CONVERTIDO_EM_PROSPECT,
          requiresActionRole: UserRole.COMERCIAL,
          lastInteractionAt: new Date(),
          history: {
            create: {
              eventType: TicketHistoryEventType.STATUS_CHANGED,
              title: 'Prospect vinculado',
              description: 'Entrada vinculada a um prospect existente.',
              createdById: user.sub,
              internalOnly: true,
              metadata: {
                prospectId: prospect.id,
              },
            },
          },
        },
        include: this.entradaDetailInclude(),
      });
    }

    const criteria = this.buildCandidateCriteria(ticket);
    const nomeRazaoSocial =
      this.sanitize(dto.nomeRazaoSocial) ??
      ticket.nomeSolicitante ??
      criteria.email ??
      `Prospect ${ticket.protocolo ?? ticket.id}`;
    const prospect = await this.prisma.$transaction(async (tx) => {
      const createdProspect = await tx.prospect.create({
        data: {
          nomeRazaoSocial,
          nomeContato:
            this.sanitize(dto.nomeContato) ?? ticket.nomeSolicitante ?? null,
          email: this.sanitize(dto.email) ?? criteria.email,
          telefone: this.sanitize(dto.telefone) ?? criteria.telefone,
          document: this.sanitize(dto.document) ?? criteria.document,
          cidade:
            this.sanitize(dto.cidade) ??
            this.getPayloadValue(ticket.formPayload, ['cidade', 'city']),
          estado:
            this.sanitize(dto.estado) ??
            this.getPayloadValue(ticket.formPayload, ['estado', 'uf', 'state']),
          origem: ticket.origem ?? EntradaOrigem.SITE,
          statusCadastral: ProspectStatusCadastral.PROSPECT,
          portalAccessStatus: ProspectPortalAccessStatus.SEM_ACESSO,
          createdFromTicketId: ticket.id,
        },
      });

      return tx.ticket.update({
        where: { id },
        data: {
          prospectId: createdProspect.id,
          status: TicketStatus.CONVERTIDO_EM_PROSPECT,
          requiresActionRole: UserRole.COMERCIAL,
          lastInteractionAt: new Date(),
          history: {
            create: {
              eventType: TicketHistoryEventType.STATUS_CHANGED,
              title: 'Prospect criado',
              description:
                'Prospect criado sem acesso ao portal e vinculado a entrada.',
              createdById: user.sub,
              internalOnly: true,
              metadata: {
                prospectId: createdProspect.id,
                statusCadastral: createdProspect.statusCadastral,
                portalAccessStatus: createdProspect.portalAccessStatus,
              },
            },
          },
        },
        include: this.entradaDetailInclude(),
      });
    });

    return prospect;
  }

  async createQuote(user: AuthUser, id: string, dto: CreateEntradaQuoteDto) {
    this.ensureCanManage(user);
    const ticket = await this.findOne(user, id);

    if (!ticket.prospectId && !ticket.clientId) {
      throw new BadRequestException(
        'Vincule um prospect antes de criar a cotação.',
      );
    }

    if (ticket.quoteId) {
      throw new BadRequestException(
        'Esta entrada já possui cotação vinculada.',
      );
    }

    const origin = this.sanitize(dto.origin);
    const destination = this.sanitize(dto.destination);
    const serviceType = this.sanitize(dto.serviceType);

    if (!origin || !destination || !serviceType) {
      throw new BadRequestException(
        'Informe origem, destino e tipo de serviço da cotação.',
      );
    }

    const quote = await this.prisma.$transaction(async (tx) => {
      const createdQuote = await tx.quote.create({
        data: {
          code: `TMP-${Date.now()}`,
          clientId: ticket.clientId,
          prospectId: ticket.prospectId,
          origin,
          destination,
          serviceType,
          requestType: this.sanitize(dto.requestType),
          pickupAddress: this.sanitize(dto.pickupAddress),
          deliveryAddress: this.sanitize(dto.deliveryAddress),
          cargoDescription: this.sanitize(dto.cargoDescription),
          contactName:
            this.sanitize(dto.contactName) ??
            ticket.prospect?.nomeContato ??
            ticket.nomeSolicitante,
          contactPhone:
            this.sanitize(dto.contactPhone) ??
            ticket.prospect?.telefone ??
            ticket.telefoneSolicitante,
          contactEmail:
            this.sanitize(dto.contactEmail) ??
            ticket.prospect?.email ??
            ticket.emailSolicitante,
          weight: dto.weight,
          volume: dto.volume,
          quantity: dto.quantity,
          merchandiseValue:
            dto.merchandiseValue !== undefined
              ? dto.merchandiseValue
              : undefined,
          desiredDeadline: this.sanitize(dto.desiredDeadline),
          notes: this.sanitize(dto.notes) ?? ticket.mensagem,
          history: {
            create: {
              status: QuoteStatus.RECEIVED,
              notes: 'Cotação criada a partir de ticket de entrada do site.',
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

      await tx.ticket.update({
        where: { id },
        data: {
          quoteId: createdQuote.id,
          status: TicketStatus.COTACAO_CRIADA,
          requiresActionRole: UserRole.COMERCIAL,
          lastInteractionAt: new Date(),
          history: {
            create: {
              eventType: TicketHistoryEventType.STATUS_CHANGED,
              title: 'Cotação criada',
              description:
                'Cotação criada após vinculacao de prospect ou cliente ativo.',
              createdById: user.sub,
              internalOnly: true,
              metadata: {
                quoteId: createdQuote.id,
                quoteCode,
                prospectId: ticket.prospectId,
                clientId: ticket.clientId,
              },
            },
          },
        },
      });

      return tx.quote.findUniqueOrThrow({
        where: { id: createdQuote.id },
        include: {
          client: {
            include: {
              user: true,
            },
          },
          prospect: true,
          history: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          tickets: {
            include: this.entradaListInclude(),
          },
        },
      });
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.QUOTE,
      action: AuditLogAction.QUOTE_CREATED,
      message: `Cotação criada a partir da entrada ${ticket.protocolo ?? id}.`,
      targetType: 'Quote',
      targetId: quote.id,
      userId: user.sub,
      details: {
        ticketId: id,
        prospectId: ticket.prospectId,
        clientId: ticket.clientId,
      },
    });

    return quote;
  }

  async finalizar(user: AuthUser, id: string, dto: EntradaNoteDto) {
    this.ensureCanManage(user);
    await this.findOne(user, id);

    return this.updateTerminalStatus(
      user,
      id,
      TicketStatus.FINALIZADO,
      'Entrada finalizada',
      this.sanitize(dto.note) ?? 'Atendimento de entrada finalizado.',
    );
  }

  async marcarPerdido(user: AuthUser, id: string, dto: EntradaNoteDto) {
    this.ensureCanManage(user);
    await this.findOne(user, id);

    return this.updateTerminalStatus(
      user,
      id,
      TicketStatus.PERDIDO,
      'Entrada marcada como perdida',
      this.sanitize(dto.note) ?? 'Entrada marcada como perdida.',
    );
  }

  async transferir(user: AuthUser, id: string, dto: TransferEntradaDto) {
    this.ensureCanManage(user);
    await this.findOne(user, id);

    if (dto.responsavelId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.responsavelId },
        select: { id: true, role: true, isActive: true },
      });

      if (!assignee || !assignee.isActive) {
        throw new NotFoundException('Responsável não encontrado.');
      }

      if (!['ADMIN', 'GESTAO', 'COMERCIAL'].includes(assignee.role)) {
        throw new BadRequestException(
          'Responsável precisa ser usuário interno.',
        );
      }
    }

    return this.prisma.ticket.update({
      where: { id },
      data: {
        assignedToId: dto.responsavelId ?? null,
        status: TicketStatus.TRANSFERIDO,
        requiresActionRole: UserRole.COMERCIAL,
        lastInteractionAt: new Date(),
        history: {
          create: {
            eventType: TicketHistoryEventType.STATUS_CHANGED,
            title: 'Entrada transferida',
            description: dto.responsavelId
              ? 'Responsável da entrada foi alterado.'
              : 'Responsável da entrada foi removido.',
            createdById: user.sub,
            internalOnly: true,
            metadata: {
              responsavelId: dto.responsavelId ?? null,
            },
          },
        },
      },
      include: this.entradaDetailInclude(),
    });
  }

  private updateTerminalStatus(
    user: AuthUser,
    id: string,
    status: TicketStatus,
    title: string,
    description: string,
  ) {
    return this.prisma.ticket.update({
      where: { id },
      data: {
        status,
        requiresActionRole: null,
        closedAt: new Date(),
        lastInteractionAt: new Date(),
        history: {
          create: {
            eventType: TicketHistoryEventType.STATUS_CHANGED,
            title,
            description,
            createdById: user.sub,
            internalOnly: true,
          },
        },
      },
      include: this.entradaDetailInclude(),
    });
  }
}
