import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadImportJobStatus,
  LeadImportRowStatus,
  LeadTimelineEventType,
  Prisma,
  EntradaOrigem,
  MessageSenderType,
  ProspectPortalAccessStatus,
  ProspectStatusCadastral,
  TicketHistoryEventType,
  TicketStatus,
  TicketType,
  UserRole,
  TimelineEventType,
} from '@prisma/client';

import { readFile, unlink } from 'fs/promises';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { NotificationsService } from '../notifications/notifications.service';
import { ConvertLeadToClientDto } from './dto/convert-lead-to-client.dto';
import { ConvertLeadToProspectDto } from './dto/convert-lead-to-prospect.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateLeadObservacaoDto } from './dto/create-lead-observacao.dto';
import { ImportLeadsCsvDto } from './dto/import-leads-csv.dto';
import { ReceiveWhatsAppLeadDto } from './dto/receive-whatsapp-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

type LeadFilters = {
  q?: string;
  source?: string;
  status?: string;
  convertidoParaCliente?: boolean;
};

type UploadFile = {
  path: string;
  originalname: string;
  mimetype: string;
};

type IntegrationContext = {
  integrationToken?: string;
  ipAddress?: string;
  userAgent?: string;
};

type WhatsAppWebhookVerificationInput = {
  mode?: string;
  verifyToken?: string;
  challenge?: string;
};

type NormalizedWhatsAppWebhookPayload = {
  phone: string;
  name?: string | null;
  externalMessageId?: string | null;
  externalContactId?: string | null;
  channel: 'whatsapp';
  sourcePhone?: string | null;
  timestamp?: string | null;
  messageText?: string | null;
  metadata?: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
};

type ParsedCsvRow = Record<string, string>;

const LEAD_FUNNEL_STAGES = [
  'entrada_leads',
  'conversao',
  'homologacao',
  'cotacao',
  'venda_efetivada',
  'pos_venda',
  'perdido',
] as const;

const LEAD_FUNNEL_STAGE_LABELS: Record<string, string> = {
  entrada_leads: 'Entrada de Leads',
  conversao: 'Conversão',
  homologacao: 'Homologação',
  cotacao: 'Cotação',
  venda_efetivada: 'Venda Efetivada',
  pos_venda: 'Pós-venda',
  perdido: 'Perdido',
};

const LEGACY_LEAD_STATUS_TO_FUNNEL_STAGE: Record<string, string> = {
  new: 'entrada_leads',
  contacted: 'conversao',
  qualified: 'homologacao',
  converted: 'venda_efetivada',
  converted_to_prospect: 'venda_efetivada',
  archived: 'perdido',
};

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private ensureInternalUser(user: AuthUser) {
    const allowedRoles = ['ADMIN', 'GESTAO', 'COMERCIAL', 'MARKETING'];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este recurso.',
      );
    }
  }

  private normalizeEmail(email?: string | null) {
    const value = email?.trim().toLowerCase();
    return value || null;
  }

  private normalizePhone(phone?: string | null) {
    const digits = phone?.replace(/\D/g, '') ?? '';
    return digits || null;
  }

  private sanitizeText(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private parseOptionalDate(value?: string | null) {
    const sanitized = this.sanitizeText(value);

    if (!sanitized) {
      return null;
    }

    const parsed = new Date(sanitized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private buildLeadCommercialMetadata(dto: CreateLeadDto) {
    const metadata: Record<string, string> = {};
    const fields: Array<[keyof CreateLeadDto, string]> = [
      ['logoUrl', 'logoUrl'],
      ['segment', 'segment'],
      ['transport', 'transport'],
      ['storage', 'storage'],
      ['entryDate', 'entryDate'],
      ['lastInteractionDate', 'lastInteractionDate'],
      ['monthlyEstimatedValue', 'monthlyEstimatedValue'],
      ['responsible', 'responsible'],
      ['currentStatus', 'currentStatus'],
      ['nextAction', 'nextAction'],
    ];

    fields.forEach(([dtoKey, metadataKey]) => {
      const value = this.sanitizeText(dto[dtoKey] as string | undefined);

      if (value) {
        metadata[metadataKey] = value;
      }
    });

    return Object.keys(metadata).length > 0
      ? (metadata as Prisma.InputJsonValue)
      : undefined;
  }

  private updateLeadCommercialMetadata(
    currentMetadata: Prisma.JsonValue | null | undefined,
    dto: UpdateLeadDto,
  ) {
    const metadata =
      currentMetadata && !Array.isArray(currentMetadata) && typeof currentMetadata === 'object'
        ? { ...(currentMetadata as Record<string, Prisma.JsonValue>) }
        : {};
    const fields: Array<[keyof UpdateLeadDto, string]> = [
      ['logoUrl', 'logoUrl'],
      ['segment', 'segment'],
      ['transport', 'transport'],
      ['storage', 'storage'],
      ['entryDate', 'entryDate'],
      ['lastInteractionDate', 'lastInteractionDate'],
      ['monthlyEstimatedValue', 'monthlyEstimatedValue'],
      ['responsible', 'responsible'],
      ['currentStatus', 'currentStatus'],
      ['nextAction', 'nextAction'],
    ];

    fields.forEach(([dtoKey, metadataKey]) => {
      if (dto[dtoKey] === undefined) {
        return;
      }

      const value = this.sanitizeText(dto[dtoKey] as string | undefined);

      if (value) {
        metadata[metadataKey] = value;
      } else {
        delete metadata[metadataKey];
      }
    });

    return metadata as Prisma.InputJsonValue;
  }

  private normalizeLeadFunnelStage(status?: string | null) {
    const value = this.sanitizeText(status)?.toLowerCase();

    if (!value) {
      return 'entrada_leads';
    }

    if ((LEAD_FUNNEL_STAGES as readonly string[]).includes(value)) {
      return value;
    }

    return LEGACY_LEAD_STATUS_TO_FUNNEL_STAGE[value] ?? 'entrada_leads';
  }

  private formatLeadFunnelStage(status?: string | null) {
    return (
      LEAD_FUNNEL_STAGE_LABELS[this.normalizeLeadFunnelStage(status)] ??
      'Entrada de Leads'
    );
  }

  private getEquivalentLeadStatuses(status?: string | null) {
    const normalized = this.normalizeLeadFunnelStage(status);
    const legacyStatuses = Object.entries(LEGACY_LEAD_STATUS_TO_FUNNEL_STAGE)
      .filter(([, stage]) => stage === normalized)
      .map(([legacyStatus]) => legacyStatus);

    return Array.from(new Set([normalized, ...legacyStatuses]));
  }

  private ensureObject(value: unknown) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private getWebhookToken() {
    return (
      process.env.WHATSAPP_VERIFY_TOKEN ||
      process.env.WHATSAPP_INTEGRATION_TOKEN ||
      null
    );
  }

  private toJsonValue(
    value: Prisma.JsonValue | Record<string, unknown> | undefined | null,
  ) {
    if (value === undefined || value === null) {
      return undefined;
    }

    return value as Prisma.InputJsonValue;
  }

  private async findDuplicateLead(
    email?: string | null,
    phone?: string | null,
  ) {
    const normalizedEmail = this.normalizeEmail(email);
    const normalizedPhone = this.normalizePhone(phone);

    if (normalizedEmail) {
      const existingByEmail = await this.prisma.lead.findFirst({
        where: { normalizedEmail },
      });

      if (existingByEmail) {
        return existingByEmail;
      }
    }

    if (normalizedPhone) {
      const existingByPhone = await this.prisma.lead.findFirst({
        where: { normalizedPhone },
      });

      if (existingByPhone) {
        return existingByPhone;
      }
    }

    return null;
  }

  private buildWebhookMessageSummary(
    normalizedPayload: Pick<
      NormalizedWhatsAppWebhookPayload,
      'messageText' | 'externalMessageId'
    >,
  ) {
    const parts = [
      normalizedPayload.messageText
        ? `Mensagem recebida: ${normalizedPayload.messageText}`
        : 'Mensagem recebida via webhook do WhatsApp.',
      normalizedPayload.externalMessageId
        ? `ID da mensagem: ${normalizedPayload.externalMessageId}.`
        : null,
    ].filter(Boolean);

    return parts.join(' ');
  }

  private parseTimestamp(timestamp?: string | null) {
    if (!timestamp) {
      return new Date();
    }

    const numericTimestamp = Number(timestamp);
    if (!Number.isNaN(numericTimestamp) && Number.isFinite(numericTimestamp)) {
      return new Date(numericTimestamp * 1000);
    }

    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }

    return parsed;
  }

  private normalizeWhatsAppWebhookPayload(payload: Record<string, unknown>) {
    const directPhone = this.sanitizeText(
      typeof payload.phone === 'string' ? payload.phone : null,
    );

    if (directPhone) {
      return {
        phone: directPhone,
        name: this.sanitizeText(
          typeof payload.name === 'string' ? payload.name : null,
        ),
        externalMessageId: this.sanitizeText(
          typeof payload.externalMessageId === 'string'
            ? payload.externalMessageId
            : null,
        ),
        externalContactId: this.sanitizeText(
          typeof payload.externalContactId === 'string'
            ? payload.externalContactId
            : null,
        ),
        channel: 'whatsapp' as const,
        sourcePhone: this.sanitizeText(
          typeof payload.sourcePhone === 'string' ? payload.sourcePhone : null,
        ),
        timestamp: this.sanitizeText(
          typeof payload.timestamp === 'string' ? payload.timestamp : null,
        ),
        messageText: this.sanitizeText(
          typeof payload.text === 'string'
            ? payload.text
            : typeof payload.messageText === 'string'
              ? payload.messageText
              : null,
        ),
        metadata: this.ensureObject(payload.metadata)
          ? (payload.metadata as Record<string, unknown>)
          : undefined,
        rawPayload: payload,
      };
    }

    const entries = Array.isArray(payload.entry) ? payload.entry : [];
    for (const entry of entries) {
      if (!this.ensureObject(entry)) {
        continue;
      }

      const changes = Array.isArray(entry.changes)
        ? (entry.changes as unknown[])
        : [];

      for (const change of changes) {
        if (!this.ensureObject(change)) {
          continue;
        }

        const changeRecord = change as Record<string, unknown>;
        if (!this.ensureObject(changeRecord.value)) {
          continue;
        }

        const value = changeRecord.value as Record<string, unknown>;
        const messages = Array.isArray(value.messages)
          ? (value.messages as unknown[])
          : [];
        const contacts = Array.isArray(value.contacts)
          ? (value.contacts as unknown[])
          : [];
        const metadata = this.ensureObject(value.metadata)
          ? (value.metadata as Record<string, unknown>)
          : undefined;

        const message = messages.find((item) => this.ensureObject(item));
        const contact = contacts.find((item) => this.ensureObject(item));

        if (!this.ensureObject(message)) {
          continue;
        }

        const messageRecord = message as Record<string, unknown>;
        const contactRecord = this.ensureObject(contact)
          ? (contact as Record<string, unknown>)
          : undefined;
        const textObject = this.ensureObject(messageRecord.text)
          ? (messageRecord.text as Record<string, unknown>)
          : undefined;

        const phone = this.sanitizeText(
          typeof messageRecord.from === 'string' ? messageRecord.from : null,
        );

        if (!phone) {
          continue;
        }

        return {
          phone,
          name: this.sanitizeText(
            contactRecord &&
              typeof contactRecord.profile === 'object' &&
              contactRecord.profile
              ? typeof (contactRecord.profile as Record<string, unknown>)
                  .name === 'string'
                ? ((contactRecord.profile as Record<string, unknown>)
                    .name as string)
                : null
              : null,
          ),
          externalMessageId: this.sanitizeText(
            typeof messageRecord.id === 'string' ? messageRecord.id : null,
          ),
          externalContactId: this.sanitizeText(
            typeof contactRecord?.wa_id === 'string'
              ? contactRecord.wa_id
              : null,
          ),
          channel: 'whatsapp' as const,
          sourcePhone: this.sanitizeText(
            typeof metadata?.display_phone_number === 'string'
              ? metadata.display_phone_number
              : null,
          ),
          timestamp: this.sanitizeText(
            typeof messageRecord.timestamp === 'string'
              ? messageRecord.timestamp
              : null,
          ),
          messageText: this.sanitizeText(
            typeof textObject?.body === 'string' ? textObject.body : null,
          ),
          metadata: {
            provider: 'meta-cloud-api',
            messageType:
              typeof messageRecord.type === 'string'
                ? messageRecord.type
                : null,
            businessPhoneNumberId:
              typeof metadata?.phone_number_id === 'string'
                ? metadata.phone_number_id
                : null,
          },
          rawPayload: payload,
        };
      }
    }

    throw new BadRequestException(
      'Payload de webhook do WhatsApp invalido ou sem telefone identificavel.',
    );
  }

  private async createLeadWithTimeline(
    tx: Prisma.TransactionClient,
    payload: {
      name: string;
      email?: string | null;
      phone?: string | null;
      company?: string | null;
      source: string;
      status: string;
      notes?: string | null;
      channel?: string | null;
      sourcePhone?: string | null;
      externalMessageId?: string | null;
      externalContactId?: string | null;
      metadata?: Prisma.InputJsonValue;
      rawPayload?: Prisma.InputJsonValue;
      lastInteractionAt?: Date | null;
      createdById?: string | null;
      updatedById?: string | null;
    },
    timeline: {
      type: LeadTimelineEventType;
      title: string;
      description: string;
      metadata?: Prisma.InputJsonValue;
      createdById?: string | null;
    },
    options?: {
      createTicket?: boolean;
      ticketActorId?: string | null;
    },
  ) {
    const lead = await tx.lead.create({
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        company: payload.company,
        source: payload.source,
        status: this.normalizeLeadFunnelStage(payload.status),
        notes: payload.notes,
        channel: payload.channel,
        sourcePhone: payload.sourcePhone,
        externalMessageId: payload.externalMessageId,
        externalContactId: payload.externalContactId,
        metadata: payload.metadata,
        rawPayload: payload.rawPayload,
        lastInteractionAt: payload.lastInteractionAt,
        createdById: payload.createdById,
        updatedById: payload.updatedById,
        normalizedEmail: this.normalizeEmail(payload.email),
        normalizedPhone: this.normalizePhone(payload.phone),
        timeline: {
          create: {
            type: timeline.type,
            title: timeline.title,
            description: timeline.description,
            metadata: timeline.metadata,
            createdById: timeline.createdById,
          },
        },
      },
      include: {
        timeline: {
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (options?.createTicket) {
      const ticketDescription = [
        payload.company ? `Empresa: ${payload.company}.` : null,
        payload.email ? `E-mail: ${payload.email}.` : null,
        payload.phone ? `Telefone: ${payload.phone}.` : null,
        payload.notes ? `Observacoes: ${payload.notes}` : null,
      ]
        .filter(Boolean)
        .join(' ');

      const ticket = await tx.ticket.create({
        data: {
          leadId: lead.id,
          requesterId: options.ticketActorId ?? payload.createdById ?? null,
          type: TicketType.LEAD,
          status: TicketStatus.AGUARDANDO_COMERCIAL,
          requiresActionRole: UserRole.COMERCIAL,
          internalOnly: true,
          subject: `Novo lead: ${lead.name}`,
          description:
            ticketDescription ||
            'Novo lead recebido e aguardando atendimento comercial.',
          messages: {
            create: {
              senderType: MessageSenderType.INTERNO,
              message:
                ticketDescription ||
                'Novo lead recebido e aguardando atendimento comercial.',
              isInternal: true,
              createdById: options.ticketActorId ?? payload.createdById ?? null,
            },
          },
          history: {
            create: {
              eventType: TicketHistoryEventType.CREATED,
              title: 'Lead recebido',
              description:
                'Ticket criado automaticamente a partir de um novo lead.',
              internalOnly: true,
              createdById: options.ticketActorId ?? payload.createdById ?? null,
            },
          },
        },
      });

      await this.notificationsService.notifyRoles(
        [UserRole.COMERCIAL, UserRole.ADMIN],
        {
          ticketId: ticket.id,
          title: 'Novo lead recebido',
          message:
            'Novo lead recebido. Acesse o ticket para iniciar o atendimento.',
          actorId: options.ticketActorId ?? payload.createdById ?? null,
          emailSubject: 'Novo lead recebido no CRM',
          emailSummary: `${lead.name}${lead.company ? ` - ${lead.company}` : ''}`,
        },
        tx,
      );
    }

    return lead;
  }

  private parseCsv(content: string) {
    const lines: string[][] = [];
    let current = '';
    let row: string[] = [];
    let insideQuotes = false;
    let delimiter = ',';

    for (let index = 0; index < content.length; index += 1) {
      const char = content[index];
      const nextChar = content[index + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          current += '"';
          index += 1;
        } else {
          insideQuotes = !insideQuotes;
        }
        continue;
      }

      if (!insideQuotes && (char === ',' || char === ';')) {
        row.push(current);
        delimiter = char;
        current = '';
        continue;
      }

      if (!insideQuotes && (char === '\n' || char === '\r')) {
        if (char === '\r' && nextChar === '\n') {
          index += 1;
        }
        row.push(current);
        if (row.some((value) => value.trim().length > 0)) {
          lines.push(row);
        }
        row = [];
        current = '';
        continue;
      }

      current += char;
    }

    if (current.length > 0 || row.length > 0) {
      row.push(current);
      if (row.some((value) => value.trim().length > 0)) {
        lines.push(row);
      }
    }

    if (lines.length === 0) {
      return [];
    }

    const headerLine = lines[0].map((value) => value.trim());
    const headers = headerLine.map((value) =>
      value.toLowerCase().replace(/[\s_-]+/g, ''),
    );

    return lines.slice(1).map((line, index) => {
      const normalizedLine =
        line.length === headers.length
          ? line
          : line.join(delimiter).split(delimiter);
      const rowObject: ParsedCsvRow = {};

      headers.forEach((header, headerIndex) => {
        rowObject[header] = normalizedLine[headerIndex]?.trim() ?? '';
      });

      rowObject.__rowNumber = String(index + 2);
      return rowObject;
    });
  }

  private mapCsvRow(
    row: ParsedCsvRow,
    defaults: { source: string; status: string },
  ) {
    const get = (...keys: string[]) => {
      const found = keys.find(
        (key) => row[key] !== undefined && row[key] !== '',
      );
      return found ? row[found] : '';
    };

    return {
      rowNumber: Number(row.__rowNumber || 0),
      name: get('name', 'nome'),
      email: get('email'),
      phone: get('phone', 'telefone', 'celular'),
      company: get('company', 'empresa'),
      source: get('source', 'origem') || defaults.source,
      status: get('status') || defaults.status,
      notes: get('notes', 'observacoes', 'observacao'),
    };
  }

  private async addTimelineEvent(
    tx: Prisma.TransactionClient,
    leadId: string,
    event: {
      type: LeadTimelineEventType;
      title: string;
      description: string;
      metadata?: Prisma.InputJsonValue;
      createdById?: string | null;
    },
  ) {
    return tx.leadTimelineEvent.create({
      data: {
        leadId,
        type: event.type,
        title: event.title,
        description: event.description,
        metadata: event.metadata,
        createdById: event.createdById,
      },
    });
  }

  async findAll(user: AuthUser, filters: LeadFilters) {
    this.ensureInternalUser(user);

const where: Prisma.LeadWhereInput = {
  convertidoParaCliente:
    filters.convertidoParaCliente ?? false,
};

    if (filters.source) {
      where.source = filters.source;
    }

    if (filters.status) {
      where.status = {
        in: this.getEquivalentLeadStatuses(filters.status),
      };
    }

    if (filters.q?.trim()) {
      const query = filters.q.trim();
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { company: { contains: query, mode: 'insensitive' } },
      ];
    }

    return this.prisma.lead.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        timeline: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getResumo(user: AuthUser) {
  this.ensureInternalUser(user);

  const [ativos, convertidos] = await Promise.all([
    this.prisma.lead.count({
      where: {
        convertidoParaCliente: false,
      },
    }),

    this.prisma.lead.count({
      where: {
        convertidoParaCliente: true,
      },
    }),
  ]);

  return {
    ativos,
    convertidos,
    total: ativos + convertidos,
  };
}

async findOne(user: AuthUser, id: string) {
  this.ensureInternalUser(user);

  const lead = await this.prisma.lead.findUnique({
    where: { id },

    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      observations: {
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

      timeline: {
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

  if (!lead) {
    throw new NotFoundException('Lead não encontrado.');
  }

  return lead;
}

  async criarObservacao(
  user: AuthUser,
  leadId: string,
  dto: CreateLeadObservacaoDto,
) {
  this.ensureInternalUser(user);
  

  const content = this.sanitizeText(dto.content);

  if (!content) {
    throw new BadRequestException('Informe a observação.');
  }

  

  const lead = await this.prisma.lead.findUnique({
    where: {
      id: leadId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!lead) {
    throw new NotFoundException('Lead não encontrado.');
  }

  const stage = this.normalizeLeadFunnelStage(lead.status);

  return this.prisma.$transaction(async (tx) => {
    const observacao = await tx.leadObservacao.create({
      data: {
        leadId: lead.id,
        content,
        stage,
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

    await tx.lead.update({
      where: {
        id: lead.id,
      },
      data: {
        lastInteractionAt: new Date(),
        updatedById: user.sub,
      },
    });

    return observacao;
  });
}

async listarObservacoes(
  user: AuthUser,
  leadId: string,
) {
  this.ensureInternalUser(user);

  const lead = await this.prisma.lead.findUnique({
    where: {
      id: leadId,
    },
    select: {
      id: true,
    },
  });

  if (!lead) {
    throw new NotFoundException('Lead não encontrado.');
  }

  return this.prisma.leadObservacao.findMany({
    where: {
      leadId,
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
    orderBy: {
      createdAt: 'desc',
    },
  });
}

  async createManual(user: AuthUser, dto: CreateLeadDto) {
    this.ensureInternalUser(user);

    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('Informe o nome do lead.');
    }

    const duplicate = await this.findDuplicateLead(dto.email, dto.phone);
    if (duplicate) {
      throw new ConflictException(
        `Ja existe um lead com este contato: ${duplicate.name}.`,
      );
    }

    return this.prisma.$transaction((tx) =>
      this.createLeadWithTimeline(
        tx,
        {
          name,
          email: this.sanitizeText(dto.email),
          phone: this.sanitizeText(dto.phone),
          company: this.sanitizeText(dto.company),
          source: this.sanitizeText(dto.source) ?? 'manual',
          status: this.normalizeLeadFunnelStage(dto.status),
          notes: this.sanitizeText(dto.notes),
          metadata: this.buildLeadCommercialMetadata(dto),
          lastInteractionAt: this.parseOptionalDate(dto.lastInteractionDate),
          createdById: user.sub,
          updatedById: user.sub,
        },
        {
          type: LeadTimelineEventType.CREATED_MANUAL,
          title: 'Lead criado manualmente',
          description: 'Lead cadastrado manualmente no CRM.',
          createdById: user.sub,
        },
        {
          createTicket: true,
          ticketActorId: user.sub,
        },
      ),
    );
  }

  // Excluir lead

  async excluir(user: AuthUser, leadId: string) {
  this.ensureInternalUser(user);

  const lead = await this.prisma.lead.findUnique({
    where: {
      id: leadId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!lead) {
    throw new NotFoundException('Lead não encontrado.');
  }

  await this.prisma.lead.delete({
    where: {
      id: leadId,
    },
  });

  return {
    message: 'Lead excluído com sucesso.',
  };
}

  async update(user: AuthUser, leadId: string, dto: UpdateLeadDto) {
    this.ensureInternalUser(user);

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado.');
    }

    const name = dto.name !== undefined ? dto.name.trim() : undefined;

    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Informe o nome do lead.');
    }

    const nextStatus =
      dto.status !== undefined
        ? this.normalizeLeadFunnelStage(dto.status)
        : undefined;
    const previousStatus = this.normalizeLeadFunnelStage(lead.status);
    const metadata = this.updateLeadCommercialMetadata(lead.metadata, dto);
    const lastInteractionAt =
      dto.lastInteractionDate !== undefined
        ? this.parseOptionalDate(dto.lastInteractionDate)
        : undefined;

    return this.prisma.$transaction(async (tx) => {
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(dto.email !== undefined
            ? {
                email: this.sanitizeText(dto.email),
                normalizedEmail: this.normalizeEmail(dto.email),
              }
            : {}),
          ...(dto.phone !== undefined
            ? {
                phone: this.sanitizeText(dto.phone),
                normalizedPhone: this.normalizePhone(dto.phone),
              }
            : {}),
          ...(dto.company !== undefined
            ? { company: this.sanitizeText(dto.company) }
            : {}),
          ...(dto.source !== undefined
            ? { source: this.sanitizeText(dto.source) ?? 'manual' }
            : {}),
          ...(nextStatus !== undefined ? { status: nextStatus } : {}),
          ...(dto.notes !== undefined ? { notes: this.sanitizeText(dto.notes) } : {}),
          ...(lastInteractionAt !== undefined ? { lastInteractionAt } : {}),
          metadata,
          updatedById: user.sub,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          timeline: {
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

      await this.addTimelineEvent(tx, leadId, {
        type: LeadTimelineEventType.UPDATED,
        title: 'Lead atualizado',
        description:
          nextStatus && nextStatus !== previousStatus
            ? `Dados atualizados e etapa alterada de ${this.formatLeadFunnelStage(previousStatus)} para ${this.formatLeadFunnelStage(nextStatus)}.`
            : 'Dados comerciais do lead atualizados.',
        createdById: user.sub,
      });

      return {
        ...updatedLead,
        timeline: await tx.leadTimelineEvent.findMany({
          where: { leadId },
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
        }),
      };
    });
  }

//

async convertToClient(
  user: AuthUser,
  leadId: string,
  dto: ConvertLeadToClientDto,
) {
  this.ensureInternalUser(user);

  // Procura o lead que será convertido
  const lead = await this.prisma.lead.findUnique({
    where: {
      id: leadId,
    },
  });

  if (!lead) {
    throw new NotFoundException('Lead não encontrado.');
  }

  // CNPJ/documento continua sendo obrigatório para criar o cliente
  const document = this.sanitizeText(dto.document);

  if (!document) {
    throw new BadRequestException(
      'Informe o CNPJ/documento do cliente.',
    );
  }

  // Dados que serão aproveitados do lead
  const email =
    this.sanitizeText(dto.email) ??
    this.sanitizeText(lead.email);

  const name =
    this.sanitizeText(dto.name) ??
    lead.name;

  const companyName =
    this.sanitizeText(dto.companyName) ??
    this.sanitizeText(lead.company) ??
    name;

  const phone =
    this.sanitizeText(dto.phone) ??
    this.sanitizeText(lead.phone);

  const segment =
    this.sanitizeText(dto.segment);

  const status =
    this.sanitizeText(dto.status) ??
    'PENDENTE';

  const internalOwnerId =
    this.sanitizeText(dto.internalOwnerId) ??
    user.sub;

  // Verifica se já existe cliente com esse documento
  const existingClient = await this.prisma.client.findFirst({
    where: {
      document,
    },
    select: {
      id: true,
      document: true,
    },
  });

  if (existingClient) {
    throw new ConflictException(
      'Já existe um cliente com este documento.',
    );
  }

  return this.prisma.$transaction(async (tx) => {

    // Lead convertido para cliente, marca o lead como convertido


    await tx.lead.update({
  where: {
    id: lead.id,
  },
  data: {
    convertidoParaCliente: true,
  },
  });


    const client = await tx.client.create({
      data: {
        document,
        phone,
        companyName,
        segment,
        status,
        internalOwnerId,
        notes: lead.notes,

        // Guarda e-mail/telefone como contato principal do cliente
        ...(email || phone
          ? {
              contacts: {
                create: {
                  name,
                  email,
                  phone,
                  isPrimary: true,
                },
              },
            }
          : {}),

        // Registra a criação na timeline do cliente
        timelineEvents: {
          create: {
            type: TimelineEventType.LEAD_CREATED,
            title: 'Cliente convertido de lead',
            description: `Cliente criado a partir do lead ${lead.name}.`,
            metadata: {
              leadId: lead.id,
              leadSource: lead.source,
            },
            createdById: user.sub,
          },
        },
      },

      include: {
        contacts: true,

        timelineEvents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    
    // ATUALIZA O LEAD
 

    const updatedLead = await tx.lead.update({
      where: {
        id: lead.id,
      },

      data: {
        status: 'venda_efetivada',
        convertidoParaCliente: true,

        updatedById: user.sub,

        metadata: {
          ...(this.ensureObject(lead.metadata)
            ? (lead.metadata as Prisma.JsonObject)
            : {}),

          conversionTarget: 'client',

          clientId: client.id,

          convertedAt: new Date().toISOString(),
        },

        timeline: {
          create: {
            type: LeadTimelineEventType.UPDATED,

            title: 'Lead convertido em cliente',

            description: `Cliente criado com o documento ${document}.`,

            metadata: {
              clientId: client.id,
              document,
            },

            createdById: user.sub,
          },
        },
      },

      include: {
        timeline: {
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

        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

   
    // VINCULA TICKETS EXISTENTES AO NOVO CLIENTE
  
    await tx.ticket.updateMany({
      where: {
        leadId: lead.id,
        clientId: null,
      },

      data: {
        clientId: client.id,
      },
    });

    
    // RESPOSTA
    

    return {
      lead: updatedLead,
      client,
    };
  });
}

  async updateStatus(user: AuthUser, leadId: string, status: string) {
    this.ensureInternalUser(user);

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado.');
    }

    const nextStatus = this.normalizeLeadFunnelStage(status);
    const previousStatus = this.normalizeLeadFunnelStage(lead.status);

    const updatedLead = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        status: nextStatus,
        updatedById: user.sub,
        lastInteractionAt: new Date(),
        timeline:
          previousStatus === nextStatus
            ? undefined
            : {
                create: {
                  type: LeadTimelineEventType.UPDATED,
                  title: 'Etapa do funil atualizada',
                  description: `${this.formatLeadFunnelStage(previousStatus)} → ${this.formatLeadFunnelStage(nextStatus)}.`,
                  metadata: {
                    previousStatus,
                    nextStatus,
                  },
                  createdById: user.sub,
                },
              },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        timeline: {
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

    return updatedLead;
  }

  async convertToProspect(
    user: AuthUser,
    leadId: string,
    dto: ConvertLeadToProspectDto,
  ) {
    this.ensureInternalUser(user);

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead nÃ£o encontrado.');
    }

    const email = this.sanitizeText(dto.email) ?? this.sanitizeText(lead.email);
    const telefone =
      this.sanitizeText(dto.telefone) ?? this.sanitizeText(lead.phone);
    const document = this.sanitizeText(dto.document);

    const duplicateCriteria: Prisma.ProspectWhereInput[] = [];

    if (email) {
      duplicateCriteria.push({ email: { equals: email, mode: 'insensitive' } });
    }

    if (telefone) {
      duplicateCriteria.push({
        telefone: { equals: telefone, mode: 'insensitive' },
      });
    }

    if (document) {
      duplicateCriteria.push({
        document: { equals: document, mode: 'insensitive' },
      });
    }

    const existingProspect = duplicateCriteria.length
      ? await this.prisma.prospect.findFirst({
          where: { OR: duplicateCriteria },
        })
      : null;

    return this.prisma.$transaction(async (tx) => {
      const prospect =
        existingProspect ??
        (await tx.prospect.create({
          data: {
            nomeRazaoSocial:
              this.sanitizeText(dto.nomeRazaoSocial) ??
              this.sanitizeText(lead.company) ??
              lead.name,
            nomeContato: this.sanitizeText(dto.nomeContato) ?? lead.name,
            email,
            telefone,
            document,
            cidade: this.sanitizeText(dto.cidade),
            estado: this.sanitizeText(dto.estado),
            origem: EntradaOrigem.MANUAL,
            statusCadastral: ProspectStatusCadastral.PROSPECT,
            portalAccessStatus: ProspectPortalAccessStatus.SEM_ACESSO,
          },
        }));

      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: 'conversao',
          updatedById: user.sub,
          metadata: {
            ...(this.ensureObject(lead.metadata)
              ? (lead.metadata as Prisma.JsonObject)
              : {}),
            conversionTarget: 'prospect',
            prospectId: prospect.id,
            convertedAt: new Date().toISOString(),
            reusedExistingProspect: Boolean(existingProspect),
          },
          timeline: {
            create: {
              type: LeadTimelineEventType.UPDATED,
              title: existingProspect
                ? 'Lead vinculado a prospect'
                : 'Lead convertido em prospect',
              description: existingProspect
                ? 'Lead qualificado e vinculado a um prospect existente.'
                : 'Prospect criado sem acesso ao portal. A cotacao deve ser criada somente quando houver demanda.',
              metadata: {
                prospectId: prospect.id,
                reusedExistingProspect: Boolean(existingProspect),
              },
              createdById: user.sub,
            },
          },
        },
        include: {
          timeline: {
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
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        lead: updatedLead,
        prospect,
      };
    });
  }

  async importCsv(user: AuthUser, file: UploadFile, dto: ImportLeadsCsvDto) {
    this.ensureInternalUser(user);

    const job = await this.prisma.leadImportJob.create({
      data: {
        fileName: file.originalname,
        sourceFileType: 'csv',
        status: LeadImportJobStatus.PROCESSING,
        createdById: user.sub,
      },
    });

    try {
      const fileContent = await readFile(file.path, 'utf-8');
      const parsedRows = this.parseCsv(fileContent);
      const defaultSource =
        this.sanitizeText(dto.defaultSource) ?? 'import_csv';
      const defaultStatus =
        this.sanitizeText(dto.defaultStatus) ?? 'entrada_leads';
      const rowResults: Array<Prisma.LeadImportRowResultCreateManyInput> = [];
      let successCount = 0;
      let ignoredCount = 0;
      let failureCount = 0;

      for (const rawRow of parsedRows) {
        const mapped = this.mapCsvRow(rawRow, {
          source: defaultSource,
          status: defaultStatus,
        });

        if (!mapped.name.trim()) {
          ignoredCount += 1;
          rowResults.push({
            jobId: job.id,
            rowNumber: mapped.rowNumber,
            status: LeadImportRowStatus.SKIPPED,
            reason: 'Linha ignorada: nome obrigatório ausente.',
            rawData: rawRow,
          });
          continue;
        }

        const duplicate = await this.findDuplicateLead(
          mapped.email,
          mapped.phone,
        );
        if (duplicate) {
          ignoredCount += 1;
          rowResults.push({
            jobId: job.id,
            rowNumber: mapped.rowNumber,
            status: LeadImportRowStatus.SKIPPED,
            reason: `Duplicado: lead existente ${duplicate.name}.`,
            rawData: rawRow,
            leadId: duplicate.id,
          });
          continue;
        }

        try {
          const createdLead = await this.prisma.$transaction((tx) =>
            this.createLeadWithTimeline(
              tx,
              {
                name: mapped.name.trim(),
                email: this.sanitizeText(mapped.email),
                phone: this.sanitizeText(mapped.phone),
                company: this.sanitizeText(mapped.company),
                source: mapped.source.trim(),
                status: this.normalizeLeadFunnelStage(mapped.status),
                notes: this.sanitizeText(mapped.notes),
                createdById: user.sub,
                updatedById: user.sub,
              },
              {
                type: LeadTimelineEventType.IMPORTED_CSV,
                title: 'Lead importado por planilha',
                description: `Lead importado da planilha ${file.originalname}.`,
                createdById: user.sub,
                metadata: {
                  fileName: file.originalname,
                  rowNumber: mapped.rowNumber,
                },
              },
              {
                createTicket: false,
                ticketActorId: user.sub,
              },
            ),
          );

          successCount += 1;
          rowResults.push({
            jobId: job.id,
            rowNumber: mapped.rowNumber,
            status: LeadImportRowStatus.IMPORTED,
            reason: 'Lead importado com sucesso.',
            rawData: rawRow,
            leadId: createdLead.id,
          });
        } catch (error) {
          failureCount += 1;
          rowResults.push({
            jobId: job.id,
            rowNumber: mapped.rowNumber,
            status: LeadImportRowStatus.FAILED,
            reason:
              error instanceof Error
                ? error.message
                : 'Falha ao importar linha.',
            rawData: rawRow,
          });
        }
      }

      if (rowResults.length > 0) {
        await this.prisma.leadImportRowResult.createMany({
          data: rowResults,
        });
      }

      const totalRows = parsedRows.length;
      const finalStatus =
        failureCount > 0 || ignoredCount > 0
          ? LeadImportJobStatus.COMPLETED_WITH_ERRORS
          : LeadImportJobStatus.COMPLETED;

      return this.prisma.leadImportJob.update({
        where: { id: job.id },
        data: {
          totalRows,
          successCount,
          ignoredCount,
          failureCount,
          status: finalStatus,
          completedAt: new Date(),
          summary: {
            totalRows,
            imported: successCount,
            ignored: ignoredCount,
            failed: failureCount,
          },
        },
        include: {
          rowResults: {
            orderBy: {
              rowNumber: 'asc',
            },
            include: {
              lead: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  company: true,
                  source: true,
                  status: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      await this.prisma.leadImportJob.update({
        where: { id: job.id },
        data: {
          status: LeadImportJobStatus.FAILED,
          completedAt: new Date(),
          summary: {
            message:
              error instanceof Error
                ? error.message
                : 'Falha ao processar CSV.',
          },
        },
      });

      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Falha ao importar leads.',
      );
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
  }

  async getImportJobs(user: AuthUser) {
    this.ensureInternalUser(user);

    return this.prisma.leadImportJob.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        rowResults: {
          orderBy: {
            rowNumber: 'asc',
          },
          take: 4,
        },
        _count: {
          select: {
            rowResults: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
  }

  async getImportJob(user: AuthUser, id: string) {
    this.ensureInternalUser(user);

    const job = await this.prisma.leadImportJob.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        rowResults: {
          include: {
            lead: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                company: true,
                source: true,
                status: true,
              },
            },
          },
          orderBy: {
            rowNumber: 'asc',
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Importação não encontrada.');
    }

    return job;
  }

  verifyWhatsAppWebhook(input: WhatsAppWebhookVerificationInput) {
    const expectedToken = this.getWebhookToken();

    if (!expectedToken) {
      throw new ForbiddenException(
        'Token de verificação do WhatsApp não configurado.',
      );
    }

    if (
      input.mode !== 'subscribe' ||
      !input.verifyToken ||
      input.verifyToken !== expectedToken
    ) {
      throw new ForbiddenException(
        'Verificação do webhook do WhatsApp recusada.',
      );
    }

    return input.challenge ?? 'ok';
  }

  async receiveWhatsAppWebhook(
    payload: Record<string, unknown>,
    context: IntegrationContext,
  ) {
    const normalizedPayload = this.normalizeWhatsAppWebhookPayload(payload);

    return this.receiveFromWhatsApp(
      {
        phone: normalizedPayload.phone,
        name: normalizedPayload.name ?? undefined,
        notes: normalizedPayload.messageText ?? undefined,
        externalMessageId: normalizedPayload.externalMessageId ?? undefined,
        externalContactId: normalizedPayload.externalContactId ?? undefined,
        sourcePhone: normalizedPayload.sourcePhone ?? undefined,
        channel: normalizedPayload.channel,
        metadata: {
          ...(normalizedPayload.metadata ?? {}),
          webhookTimestamp: normalizedPayload.timestamp ?? null,
          messageText: normalizedPayload.messageText ?? null,
        },
        rawPayload: normalizedPayload.rawPayload,
      },
      context,
    );
  }

  async receiveFromWhatsApp(
    dto: ReceiveWhatsAppLeadDto,
    context: IntegrationContext,
  ) {
    const configuredToken =
      process.env.WHATSAPP_INTEGRATION_TOKEN ||
      process.env.WHATSAPP_VERIFY_TOKEN;

    if (!configuredToken) {
      throw new ForbiddenException(
        'Token de integração do WhatsApp não configurado.',
      );
    }

    if (
      !context.integrationToken ||
      context.integrationToken !== configuredToken
    ) {
      throw new ForbiddenException('Token de integração invalido.');
    }

    const phone = this.sanitizeText(dto.phone);
    if (!phone) {
      throw new BadRequestException('Informe o telefone do contato.');
    }

    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      throw new BadRequestException(
        'Telefone invalido para integração de WhatsApp.',
      );
    }

    const existingLead = await this.prisma.lead.findFirst({
      where: { normalizedPhone },
    });

    if (existingLead) {
      const metadataRecord = this.ensureObject(dto.metadata)
        ? (dto.metadata as Record<string, unknown>)
        : undefined;
      const interactionDate = this.parseTimestamp(
        this.sanitizeText(
          typeof metadataRecord?.webhookTimestamp === 'string'
            ? metadataRecord.webhookTimestamp
            : null,
        ),
      );

      const updatedLead = await this.prisma.$transaction(async (tx) => {
        const lead = await tx.lead.update({
          where: { id: existingLead.id },
          data: {
            name: existingLead.name || this.sanitizeText(dto.name) || undefined,
            company:
              existingLead.company ||
              this.sanitizeText(dto.company) ||
              undefined,
            notes:
              existingLead.notes || this.sanitizeText(dto.notes) || undefined,
            externalMessageId:
              this.sanitizeText(dto.externalMessageId) ??
              existingLead.externalMessageId,
            externalContactId:
              this.sanitizeText(dto.externalContactId) ??
              existingLead.externalContactId,
            channel:
              this.sanitizeText(dto.channel) ??
              existingLead.channel ??
              'whatsapp',
            sourcePhone:
              this.sanitizeText(dto.sourcePhone) ?? existingLead.sourcePhone,
            lastInteractionAt: interactionDate,
            metadata: this.toJsonValue(dto.metadata ?? existingLead.metadata),
            rawPayload: this.toJsonValue(
              dto.rawPayload ?? existingLead.rawPayload,
            ),
          },
        });

        await this.addTimelineEvent(tx, existingLead.id, {
          type: LeadTimelineEventType.WHATSAPP_INTERACTION,
          title: 'Interacao recebida via WhatsApp',
          description: this.buildWebhookMessageSummary({
            messageText: this.sanitizeText(dto.notes),
            externalMessageId: this.sanitizeText(dto.externalMessageId),
          }),
          metadata: {
            externalMessageId: dto.externalMessageId ?? null,
            externalContactId: dto.externalContactId ?? null,
            ipAddress: context.ipAddress ?? null,
            sourcePhone: dto.sourcePhone ?? null,
            messageText: dto.notes ?? null,
          },
        });

        return lead;
      });

      return {
        created: false,
        lead: updatedLead,
        message: 'Interacao registrada no lead existente.',
      };
    }

    const metadataRecord = this.ensureObject(dto.metadata)
      ? (dto.metadata as Record<string, unknown>)
      : undefined;
    const interactionDate = this.parseTimestamp(
      this.sanitizeText(
        typeof metadataRecord?.webhookTimestamp === 'string'
          ? metadataRecord.webhookTimestamp
          : null,
      ),
    );

    const createdLead = await this.prisma.$transaction((tx) =>
      this.createLeadWithTimeline(
        tx,
        {
          name: this.sanitizeText(dto.name) ?? 'Contato via WhatsApp',
          email: null,
          phone,
          company: this.sanitizeText(dto.company),
          source: 'whatsapp',
          status: 'new',
          notes: this.sanitizeText(dto.notes),
          channel: this.sanitizeText(dto.channel) ?? 'whatsapp',
          sourcePhone: this.sanitizeText(dto.sourcePhone),
          externalMessageId: this.sanitizeText(dto.externalMessageId),
          externalContactId: this.sanitizeText(dto.externalContactId),
          metadata: this.toJsonValue(dto.metadata),
          rawPayload: this.toJsonValue(dto.rawPayload),
          lastInteractionAt: interactionDate,
        },
        {
          type: LeadTimelineEventType.WHATSAPP_CREATED,
          title: 'Lead criado via WhatsApp',
          description: this.buildWebhookMessageSummary({
            messageText: this.sanitizeText(dto.notes),
            externalMessageId: this.sanitizeText(dto.externalMessageId),
          }),
          metadata: {
            externalMessageId: dto.externalMessageId ?? null,
            externalContactId: dto.externalContactId ?? null,
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null,
            sourcePhone: dto.sourcePhone ?? null,
            messageText: dto.notes ?? null,
          },
        },
        {
          createTicket: true,
          ticketActorId: null,
        },
      ),
    );

    return {
      created: true,
      lead: createdLead,
      message: 'Lead criado via integração de WhatsApp.',
    };
  }
}
