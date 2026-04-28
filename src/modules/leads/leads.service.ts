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
  MessageSenderType,
  TicketHistoryEventType,
  TicketStatus,
  TicketType,
  UserRole,
} from '@prisma/client';
import { readFile, unlink } from 'fs/promises';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ImportLeadsCsvDto } from './dto/import-leads-csv.dto';
import { ReceiveWhatsAppLeadDto } from './dto/receive-whatsapp-lead.dto';

type LeadFilters = {
  q?: string;
  source?: string;
  status?: string;
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

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private ensureInternalUser(user: AuthUser) {
    const allowedRoles = ['ADMIN', 'GESTAO', 'COMERCIAL', 'MARKETING'];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Voce nao tem permissao para acessar este recurso.');
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

  private toJsonValue(value: Prisma.JsonValue | Record<string, unknown> | undefined | null) {
    if (value === undefined || value === null) {
      return undefined;
    }

    return value as Prisma.InputJsonValue;
  }

  private async findDuplicateLead(email?: string | null, phone?: string | null) {
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
        name: this.sanitizeText(typeof payload.name === 'string' ? payload.name : null),
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
            contactRecord && typeof contactRecord.profile === 'object' && contactRecord.profile
              ? typeof (contactRecord.profile as Record<string, unknown>).name === 'string'
                ? ((contactRecord.profile as Record<string, unknown>).name as string)
                : null
              : null,
          ),
          externalMessageId: this.sanitizeText(
            typeof messageRecord.id === 'string' ? messageRecord.id : null,
          ),
          externalContactId: this.sanitizeText(
            typeof contactRecord?.wa_id === 'string' ? contactRecord.wa_id : null,
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
              typeof messageRecord.type === 'string' ? messageRecord.type : null,
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
        status: payload.status,
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
      ].filter(Boolean).join(' ');

      const ticket = await tx.ticket.create({
        data: {
          leadId: lead.id,
          requesterId: options.ticketActorId ?? payload.createdById ?? null,
          type: TicketType.LEAD,
          status: TicketStatus.AGUARDANDO_COMERCIAL,
          requiresActionRole: UserRole.COMERCIAL,
          subject: `Novo lead: ${lead.name}`,
          description:
            ticketDescription || 'Novo lead recebido e aguardando atendimento comercial.',
          messages: {
            create: {
              senderType: MessageSenderType.INTERNO,
              message:
                ticketDescription ||
                'Novo lead recebido e aguardando atendimento comercial.',
              createdById: options.ticketActorId ?? payload.createdById ?? null,
            },
          },
          history: {
            create: {
              eventType: TicketHistoryEventType.CREATED,
              title: 'Lead recebido',
              description: 'Ticket criado automaticamente a partir de um novo lead.',
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
          message: 'Novo lead recebido. Acesse o ticket para iniciar o atendimento.',
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

  private mapCsvRow(row: ParsedCsvRow, defaults: { source: string; status: string }) {
    const get = (...keys: string[]) => {
      const found = keys.find((key) => row[key] !== undefined && row[key] !== '');
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

    const where: Prisma.LeadWhereInput = {};

    if (filters.source) {
      where.source = filters.source;
    }

    if (filters.status) {
      where.status = filters.status;
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
      throw new NotFoundException('Lead nao encontrado.');
    }

    return lead;
  }

  async createManual(user: AuthUser, dto: CreateLeadDto) {
    this.ensureInternalUser(user);

    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('Informe o nome do lead.');
    }

    const duplicate = await this.findDuplicateLead(dto.email, dto.phone);
    if (duplicate) {
      throw new ConflictException(`Ja existe um lead com este contato: ${duplicate.name}.`);
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
          status: this.sanitizeText(dto.status) ?? 'new',
          notes: this.sanitizeText(dto.notes),
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
      const defaultSource = this.sanitizeText(dto.defaultSource) ?? 'import_csv';
      const defaultStatus = this.sanitizeText(dto.defaultStatus) ?? 'new';
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
            reason: 'Linha ignorada: nome obrigatorio ausente.',
            rawData: rawRow,
          });
          continue;
        }

        const duplicate = await this.findDuplicateLead(mapped.email, mapped.phone);
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
                status: mapped.status.trim(),
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
            reason: error instanceof Error ? error.message : 'Falha ao importar linha.',
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
            message: error instanceof Error ? error.message : 'Falha ao processar CSV.',
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
      throw new NotFoundException('Importacao nao encontrada.');
    }

    return job;
  }

  verifyWhatsAppWebhook(input: WhatsAppWebhookVerificationInput) {
    const expectedToken = this.getWebhookToken();

    if (!expectedToken) {
      throw new ForbiddenException('Token de verificacao do WhatsApp nao configurado.');
    }

    if (
      input.mode !== 'subscribe' ||
      !input.verifyToken ||
      input.verifyToken !== expectedToken
    ) {
      throw new ForbiddenException('Verificacao do webhook do WhatsApp recusada.');
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

  async receiveFromWhatsApp(dto: ReceiveWhatsAppLeadDto, context: IntegrationContext) {
    const configuredToken =
      process.env.WHATSAPP_INTEGRATION_TOKEN ||
      process.env.WHATSAPP_VERIFY_TOKEN;

    if (!configuredToken) {
      throw new ForbiddenException('Token de integracao do WhatsApp nao configurado.');
    }

    if (!context.integrationToken || context.integrationToken !== configuredToken) {
      throw new ForbiddenException('Token de integracao invalido.');
    }

    const phone = this.sanitizeText(dto.phone);
    if (!phone) {
      throw new BadRequestException('Informe o telefone do contato.');
    }

    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      throw new BadRequestException('Telefone invalido para integracao de WhatsApp.');
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
            company: existingLead.company || this.sanitizeText(dto.company) || undefined,
            notes: existingLead.notes || this.sanitizeText(dto.notes) || undefined,
            externalMessageId:
              this.sanitizeText(dto.externalMessageId) ?? existingLead.externalMessageId,
            externalContactId:
              this.sanitizeText(dto.externalContactId) ?? existingLead.externalContactId,
            channel: this.sanitizeText(dto.channel) ?? existingLead.channel ?? 'whatsapp',
            sourcePhone: this.sanitizeText(dto.sourcePhone) ?? existingLead.sourcePhone,
            lastInteractionAt: interactionDate,
            metadata: this.toJsonValue(dto.metadata ?? existingLead.metadata),
            rawPayload: this.toJsonValue(dto.rawPayload ?? existingLead.rawPayload),
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
      message: 'Lead criado via integracao de WhatsApp.',
    };
  }
}
