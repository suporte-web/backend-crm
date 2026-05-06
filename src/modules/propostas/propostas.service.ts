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
  StatusLogEmail,
  StatusProposta,
  TicketHistoryEventType,
  TicketStatus,
  TicketType,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ChatsService } from '../chats/chats.service';
import { ClientPropostaDecisionDto } from './dto/client-proposta-decision.dto';
import { CreatePropostaDto } from './dto/create-proposta.dto';
import { ManagementPropostaDecisionDto } from './dto/management-proposta-decision.dto';
import { UpdatePropostaDto } from './dto/update-proposta.dto';

const PROPOSTA_EDITAVEL: StatusProposta[] = [
  StatusProposta.RASCUNHO,
  StatusProposta.AJUSTE_SOLICITADO_PELO_CLIENTE,
  StatusProposta.AJUSTE_SOLICITADO_PELA_GESTAO,
];

const MENSAGEM_PROPOSTA_CLIENTE =
  'Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.';

type EmailRecipient = {
  userId: string;
  name: string;
  email: string;
};

type UploadedPropostaFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

type TicketWithAccessData = Prisma.TicketGetPayload<{
  include: {
    client: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    };
    assignedTo: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

@Injectable()
export class PropostasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatsService: ChatsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private generateDisplayCode(prefix: 'PROP', source: string) {
    let hash = 0;

    for (const char of source) {
      hash = (hash * 31 + char.charCodeAt(0)) % 1000000;
    }

    return `${prefix}-${String(hash).padStart(6, '0')}`;
  }

  private isInternalUser(user: AuthUser) {
    return ['ADMIN', 'GESTAO', 'COMERCIAL'].includes(user.role);
  }

  private ensureInternalUser(user: AuthUser) {
    if (!this.isInternalUser(user)) {
      throw new ForbiddenException(
        'Voce nao tem permissao para acessar este recurso.',
      );
    }
  }

  private ensureClientUser(user: AuthUser) {
    if (user.role !== 'CLIENTE') {
      throw new ForbiddenException('Apenas o cliente pode executar esta acao.');
    }
  }

  private ensureManagementUser(user: AuthUser) {
    if (!['ADMIN', 'GESTAO'].includes(user.role)) {
      throw new ForbiddenException('Apenas a Gestao pode executar esta acao.');
    }
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

    if (decimal.lte(0)) {
      return null;
    }

    return decimal;
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

  private async syncNegotiatedValue(
    tx: Prisma.TransactionClient,
    input: {
      quoteId?: string | null;
      opportunityId?: string | null;
      valor?: number | Prisma.Decimal | null;
      commercialNotes?: string | null;
      markQuoteAnswered?: boolean;
    },
  ) {
    if (input.valor === undefined || input.valor === null) {
      return;
    }

    const value = new Prisma.Decimal(input.valor);

    if (input.quoteId) {
      await tx.quote.update({
        where: { id: input.quoteId },
        data: {
          price: value,
          ...(input.commercialNotes !== undefined
            ? { commercialNotes: this.sanitize(input.commercialNotes) }
            : {}),
          ...(input.markQuoteAnswered
            ? {
                status: QuoteStatus.ANSWERED,
                history: {
                  create: {
                    status: QuoteStatus.ANSWERED,
                    notes:
                      this.sanitize(input.commercialNotes) ??
                      'Valor negociado registrado na proposta.',
                  },
                },
              }
            : {}),
        },
      });
    }

    if (input.opportunityId) {
      await tx.opportunity.update({
        where: { id: input.opportunityId },
        data: {
          value,
          stage: OpportunityStage.PROPOSTA,
        },
      });
    }
  }

  private buildArquivoData(file?: UploadedPropostaFile) {
    if (!file) {
      return {};
    }

    return {
      arquivoNome: file.originalname,
      arquivoUrl: `/uploads/propostas/${file.filename}`,
      arquivoMimeType: file.mimetype,
      arquivoTamanho: file.size,
    };
  }

  private buildMessageAttachments(proposta: {
    arquivoNome?: string | null;
    arquivoUrl?: string | null;
    arquivoMimeType?: string | null;
    arquivoTamanho?: number | null;
  }): Prisma.InputJsonValue | undefined {
    if (!proposta.arquivoUrl) {
      return undefined;
    }

    return [
      {
        name: proposta.arquivoNome ?? 'Proposta',
        url: proposta.arquivoUrl,
        mimeType: proposta.arquivoMimeType ?? null,
        size: proposta.arquivoTamanho ?? null,
      },
    ];
  }

  private getActionRole(status: TicketStatus): PrismaUserRole | null {
    const commercialStatuses: TicketStatus[] = [
      TicketStatus.NEW,
      TicketStatus.NOVO,
      TicketStatus.ABERTO,
      TicketStatus.AGUARDANDO_COMERCIAL,
      TicketStatus.APROVADO_CLIENTE,
      TicketStatus.AJUSTE_SOLICITADO,
      TicketStatus.EM_ANDAMENTO,
      TicketStatus.IN_PROGRESS,
    ];
    const clientStatuses: TicketStatus[] = [
      TicketStatus.AGUARDANDO_CLIENTE,
      TicketStatus.RESPONDIDO,
    ];

    if (commercialStatuses.includes(status)) {
      return PrismaUserRole.COMERCIAL;
    }

    if (clientStatuses.includes(status)) {
      return PrismaUserRole.CLIENTE;
    }

    if (status === TicketStatus.AGUARDANDO_GESTAO) {
      return PrismaUserRole.GESTAO;
    }

    return null;
  }

  private assertTicketAccess(user: AuthUser, ticket: TicketWithAccessData) {
    if (user.role === 'CLIENTE') {
      if (ticket.internalOnly || ticket.client?.userId !== user.sub) {
        throw new NotFoundException('Ticket nao encontrado.');
      }
      return;
    }

    if (!this.isInternalUser(user)) {
      throw new ForbiddenException(
        'Voce nao tem permissao para acessar tickets.',
      );
    }
  }

  private async getTicketOrThrow(ticketId: string, user: AuthUser) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
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
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket nao encontrado.');
    }

    this.assertTicketAccess(user, ticket);
    return ticket;
  }

  private includePropostaRelations(user: AuthUser): Prisma.PropostaInclude {
    const includeInternalUsers = this.isInternalUser(user);

    return {
      ticket: {
        select: {
          id: true,
          subject: true,
          status: true,
          type: true,
        },
      },
      quote: true,
      opportunity: includeInternalUsers,
      client: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: includeInternalUsers,
            },
          },
        },
      },
      criadaPor: includeInternalUsers
        ? {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          }
        : false,
      enviadaPor: includeInternalUsers
        ? {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          }
        : false,
    };
  }

  private buildPropostaData(dto: CreatePropostaDto | UpdatePropostaDto) {
    const data: Prisma.PropostaUncheckedUpdateInput = {};

    if (dto.titulo !== undefined) {
      const titulo = this.sanitize(dto.titulo);
      if (!titulo) {
        throw new BadRequestException('Informe o titulo da proposta.');
      }
      data.titulo = titulo;
    }

    if (dto.descricao !== undefined) {
      data.descricao = this.sanitize(dto.descricao);
    }
    if (dto.descricaoServico !== undefined) {
      data.descricaoServico = this.sanitize(dto.descricaoServico);
    }
    if (dto.origem !== undefined) {
      data.origem = this.sanitize(dto.origem);
    }
    if (dto.destino !== undefined) {
      data.destino = this.sanitize(dto.destino);
    }
    if (dto.valor !== undefined) {
      data.valor = this.assertPositiveProposalValue(dto.valor);
    }
    if (dto.condicoesPagamento !== undefined) {
      data.condicoesPagamento = this.sanitize(dto.condicoesPagamento);
    }
    if (dto.condicoesComerciais !== undefined) {
      data.condicoesComerciais = this.sanitize(dto.condicoesComerciais);
    }
    if (dto.observacoes !== undefined) {
      data.observacoes = this.sanitize(dto.observacoes);
    }
    if (dto.validadeDias !== undefined) {
      data.validadeDias = this.sanitize(dto.validadeDias);
    }
    if (dto.validaAte !== undefined) {
      data.validaAte = dto.validaAte ? new Date(dto.validaAte) : null;
    }

    return data;
  }

  private async getPropostaOrThrow(
    user: AuthUser,
    ticketId: string,
    propostaId: string,
  ) {
    await this.getTicketOrThrow(ticketId, user);

    const proposta = await this.prisma.proposta.findFirst({
      where: {
        id: propostaId,
        ticketId,
      },
      include: this.includePropostaRelations(user),
    });

    if (!proposta) {
      throw new NotFoundException('Proposta nao encontrada.');
    }

    return proposta;
  }

  async create(
    user: AuthUser,
    ticketId: string,
    dto: CreatePropostaDto,
    arquivo?: UploadedPropostaFile,
  ) {
    this.ensureInternalUser(user);
    const ticket = await this.getTicketOrThrow(ticketId, user);

    if (ticket.prospectId && !ticket.clientId) {
      throw new BadRequestException(
        'Prospect precisa virar cliente ativo antes de criar proposta ou contrato.',
      );
    }

    this.assertPositiveProposalValue(dto.valor);
    const data: Prisma.PropostaUncheckedUpdateInput = {
      ...this.buildPropostaData(dto),
      ...this.buildArquivoData(arquivo),
    };

    if (!data.titulo) {
      throw new BadRequestException('Informe o titulo da proposta.');
    }

    const proposta = await this.prisma.$transaction(async (tx) => {
      const lastProposta = await tx.proposta.findFirst({
        where: { ticketId },
        orderBy: { versao: 'desc' },
        select: { versao: true },
      });
      const versao = (lastProposta?.versao ?? 0) + 1;

      const created = await tx.proposta.create({
        data: {
          ...data,
          code: `TMP-${Date.now()}`,
          ticketId,
          quoteId: ticket.quoteId,
          opportunityId: ticket.opportunityId,
          clientId: ticket.clientId,
          criadaPorId: user.sub,
          status: StatusProposta.RASCUNHO,
          versao,
        } as Prisma.PropostaUncheckedCreateInput,
        include: this.includePropostaRelations(user),
      });

      const propostaCode = this.generateDisplayCode('PROP', created.id);
      const propostaWithCode = await tx.proposta.update({
        where: { id: created.id },
        data: {
          code: propostaCode,
        },
        include: this.includePropostaRelations(user),
      });

      await this.syncNegotiatedValue(tx, {
        quoteId: ticket.quoteId,
        opportunityId: ticket.opportunityId,
        valor: dto.valor,
        commercialNotes: dto.observacoes ?? dto.condicoesComerciais,
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          eventType: TicketHistoryEventType.CREATED,
          title: 'Proposta criada',
          description: `Proposta v${versao} criada em rascunho.`,
          createdById: user.sub,
          metadata: {
            propostaId: created.id,
            propostaCode,
            versao,
            status: created.status,
          },
        },
      });

      return propostaWithCode;
    });

    return proposta;
  }

  async findAll(user: AuthUser, ticketId: string) {
    await this.getTicketOrThrow(ticketId, user);

    return this.prisma.proposta.findMany({
      where: { ticketId },
      include: this.includePropostaRelations(user),
      orderBy: [
        {
          versao: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async findOne(user: AuthUser, ticketId: string, propostaId: string) {
    return this.getPropostaOrThrow(user, ticketId, propostaId);
  }

  async update(
    user: AuthUser,
    ticketId: string,
    propostaId: string,
    dto: UpdatePropostaDto,
    arquivo?: UploadedPropostaFile,
  ) {
    this.ensureInternalUser(user);
    const proposta = await this.getPropostaOrThrow(user, ticketId, propostaId);

    if (!PROPOSTA_EDITAVEL.includes(proposta.status)) {
      throw new BadRequestException(
        'Esta proposta nao pode ser editada no status atual.',
      );
    }

    this.assertPositiveProposalValue(
      dto.valor !== undefined ? dto.valor : proposta.valor,
    );

    const data: Prisma.PropostaUncheckedUpdateInput = {
      ...this.buildPropostaData(dto),
      ...this.buildArquivoData(arquivo),
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.proposta.update({
        where: { id: propostaId },
        data,
        include: this.includePropostaRelations(user),
      });

      await this.syncNegotiatedValue(tx, {
        quoteId: proposta.quoteId,
        opportunityId: proposta.opportunityId,
        valor: dto.valor,
        commercialNotes: dto.observacoes ?? dto.condicoesComerciais,
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          eventType: TicketHistoryEventType.STATUS_CHANGED,
          title: 'Proposta editada',
          description: `Proposta v${proposta.versao} editada.`,
          createdById: user.sub,
          metadata: {
            propostaId,
            versao: proposta.versao,
            status: proposta.status,
          },
        },
      });

      return result;
    });

    return updated;
  }

  async sendToClient(
    user: AuthUser,
    ticketId: string,
    propostaId: string,
    dto: UpdatePropostaDto = {},
  ) {
    this.ensureInternalUser(user);
    const ticket = await this.getTicketOrThrow(ticketId, user);

    if (!ticket.client?.user?.email || !ticket.client.userId) {
      throw new BadRequestException(
        'Ticket precisa ter um cliente com usuario e e-mail para envio da proposta.',
      );
    }
    const clientUserId = ticket.client.userId;
    const clientUser = ticket.client.user;

    const proposta = await this.prisma.proposta.findFirst({
      where: {
        id: propostaId,
        ticketId,
      },
    });

    if (!proposta) {
      throw new NotFoundException('Proposta nao encontrada.');
    }

    if (!PROPOSTA_EDITAVEL.includes(proposta.status)) {
      throw new BadRequestException(
        'Esta proposta nao pode ser enviada ao cliente no status atual.',
      );
    }

    this.assertPositiveProposalValue(
      dto.valor !== undefined ? dto.valor : proposta.valor,
    );

    const now = new Date();
    const link = `/tickets?ticket=${ticketId}`;
    const emailSubject = 'Proposta disponivel para analise';
    const pendingData = this.buildPropostaData(dto);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedProposta = await tx.proposta.update({
        where: { id: propostaId },
        data: {
          ...pendingData,
          status: StatusProposta.ENVIADA_AO_CLIENTE,
          enviadaEm: now,
          enviadaPorId: user.sub,
          motivoRecusaCliente: null,
        },
        include: this.includePropostaRelations(user),
      });

      await this.syncNegotiatedValue(tx, {
        quoteId: proposta.quoteId,
        opportunityId: proposta.opportunityId,
        valor: dto.valor !== undefined ? dto.valor : proposta.valor,
        commercialNotes:
          dto.observacoes ??
          dto.condicoesComerciais ??
          proposta.observacoes ??
          proposta.condicoesComerciais,
        markQuoteAnswered: true,
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.AGUARDANDO_CLIENTE,
          requiresActionRole: this.getActionRole(
            TicketStatus.AGUARDANDO_CLIENTE,
          ),
          lastInteractionAt: now,
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId,
          senderType: MessageSenderType.INTERNO,
          message: 'O Comercial enviou uma proposta para analise do cliente.',
          attachments: this.buildMessageAttachments(proposta),
          createdById: user.sub,
        },
      });

      const propostaChat = await this.chatsService.ensurePropostaChat(tx, {
        propostaId,
        code: proposta.code,
        ticketId,
        actorId: user.sub,
        clientId: proposta.clientId,
        clientUserId,
        quoteId: proposta.quoteId,
        criadaPorId: proposta.criadaPorId,
        enviadaPorId: user.sub,
        assignedToId: ticket.assignedToId,
        requesterId: ticket.requesterId,
      });
      const ticketChat = await this.chatsService.ensureTicketChat(tx, {
        ticketId,
        subject: ticket.subject,
        actorId: user.sub,
        requesterId: ticket.requesterId,
        assignedToId: ticket.assignedToId,
        clientId: ticket.clientId,
        clientUserId,
        leadId: ticket.leadId,
        quoteId: ticket.quoteId,
        internalOnly: ticket.internalOnly,
      });
      const publicProposalMessage =
        'O Comercial enviou uma proposta para analise do cliente.';

      await this.chatsService.createMessageInTransaction(tx, {
        chatId: propostaChat.id,
        authorId: user.sub,
        content: publicProposalMessage,
        visibility: ChatMessageVisibility.PUBLICA_CLIENTE,
      });
      await this.chatsService.createMessageInTransaction(tx, {
        chatId: ticketChat.id,
        authorId: user.sub,
        content: publicProposalMessage,
        visibility: ChatMessageVisibility.PUBLICA_CLIENTE,
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          eventType: TicketHistoryEventType.PRE_PROPOSAL_SENT,
          title: 'Proposta enviada ao cliente',
          description: 'Proposta enviada para analise do cliente.',
          createdById: user.sub,
          metadata: {
            propostaId,
            versao: proposta.versao,
            status: StatusProposta.ENVIADA_AO_CLIENTE,
          },
        },
      });

      const notification = await tx.notification.create({
        data: {
          userId: clientUserId,
          ticketId,
          title: emailSubject,
          message: MENSAGEM_PROPOSTA_CLIENTE,
          link,
          metadata: {
            propostaId,
            versao: proposta.versao,
            status: StatusProposta.ENVIADA_AO_CLIENTE,
          },
        },
      });

      const logEmail = await tx.logEmail.create({
        data: {
          ticketId,
          propostaId,
          notificationId: notification.id,
          userId: clientUserId,
          emailDestino: clientUser.email,
          assunto: emailSubject,
          resumo: MENSAGEM_PROPOSTA_CLIENTE,
          template: 'proposta_disponivel_cliente',
          status: StatusLogEmail.PENDENTE,
        },
      });

      return {
        proposta: updatedProposta,
        logEmail,
        notification,
      };
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.TICKET,
      action: AuditLogAction.PROPOSAL_SENT,
      message: `Proposta enviada ao cliente: ${proposta.code}.`,
      targetType: 'Proposta',
      targetId: propostaId,
      userId: user.sub,
      details: {
        ticketId,
        propostaId,
        clientUserId,
        status: StatusProposta.ENVIADA_AO_CLIENTE,
      },
    });

    await this.deliverProposalEmail({
      ticketId,
      propostaId,
      logEmailId: result.logEmail.id,
      actorId: user.sub,
      recipient: {
        name: clientUser.name,
        email: clientUser.email,
      },
      subject: emailSubject,
      link,
      message: MENSAGEM_PROPOSTA_CLIENTE,
    });

    const propostaAtualizada = await this.findOne(user, ticketId, propostaId);

    return {
      ...propostaAtualizada,
      proposta: propostaAtualizada,
      ticketStatus: TicketStatus.AGUARDANDO_CLIENTE,
      mensagem: 'Proposta enviada ao cliente com sucesso.',
    };
  }

  async sendToManagement(user: AuthUser, ticketId: string, propostaId: string) {
    this.ensureInternalUser(user);
    const ticket = await this.getTicketOrThrow(ticketId, user);

    const proposta = await this.prisma.proposta.findFirst({
      where: {
        id: propostaId,
        ticketId,
      },
    });

    if (!proposta) {
      throw new NotFoundException('Proposta nao encontrada.');
    }

    const allowedStatusesForManagementSend: StatusProposta[] = [
      StatusProposta.APROVADA_PELO_CLIENTE,
    ];

    if (!allowedStatusesForManagementSend.includes(proposta.status)) {
      throw new BadRequestException(
        'A proposta precisa estar aprovada pelo cliente para seguir para a Gestao.',
      );
    }

    this.assertPositiveProposalValue(proposta.valor);

    const managementRecipients = await this.getManagementRecipients();
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.proposta.update({
        where: { id: propostaId },
        data: {
          status: StatusProposta.ENVIADA_PARA_GESTAO,
          enviadaParaGestaoEm: now,
        },
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          type: TicketType.APROVACAO_GESTAO,
          status: TicketStatus.AGUARDANDO_GESTAO,
          requiresActionRole: this.getActionRole(
            TicketStatus.AGUARDANDO_GESTAO,
          ),
          lastInteractionAt: now,
        },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          eventType: TicketHistoryEventType.APPROVAL_SENT,
          title: 'Proposta enviada para aprovacao da Gestao',
          description: `A proposta ${proposta.code} foi enviada para aprovacao da Gestao.`,
          createdById: user.sub,
          metadata: {
            propostaId,
            propostaCode: proposta.code,
            versao: proposta.versao,
            status: StatusProposta.ENVIADA_PARA_GESTAO,
          },
        },
      });

      const managementParticipantIds = managementRecipients.map(
        (recipient) => recipient.userId,
      );
      const propostaChat = await this.chatsService.ensurePropostaChat(tx, {
        propostaId,
        code: proposta.code,
        ticketId,
        actorId: user.sub,
        clientId: proposta.clientId,
        clientUserId: ticket.client?.userId,
        quoteId: proposta.quoteId,
        criadaPorId: proposta.criadaPorId,
        enviadaPorId: proposta.enviadaPorId,
        assignedToId: ticket.assignedToId,
        requesterId: ticket.requesterId,
      });
      const ticketChat = await this.chatsService.ensureTicketChat(tx, {
        ticketId,
        subject: ticket.subject,
        actorId: user.sub,
        requesterId: ticket.requesterId,
        assignedToId: ticket.assignedToId,
        clientId: ticket.clientId,
        clientUserId: ticket.client?.userId,
        leadId: ticket.leadId,
        quoteId: ticket.quoteId,
        internalOnly: true,
        participantUserIds: managementParticipantIds,
      });
      const managementMessage = `A proposta ${proposta.code} foi enviada para aprovacao da Gestao.`;

      await this.chatsService.createMessageInTransaction(tx, {
        chatId: propostaChat.id,
        authorId: user.sub,
        content: managementMessage,
        visibility: ChatMessageVisibility.GESTAO_COMERCIAL,
      });
      await this.chatsService.createMessageInTransaction(tx, {
        chatId: ticketChat.id,
        authorId: user.sub,
        content: managementMessage,
        visibility: ChatMessageVisibility.GESTAO_COMERCIAL,
      });

      await Promise.all(
        managementRecipients.map((recipient) =>
          tx.notification.create({
            data: {
              userId: recipient.userId,
              ticketId,
              title: 'Proposta aguardando aprovacao da Gestao',
              message:
                'Uma proposta formal foi enviada para analise e aprovacao da Gestao.',
              link: `/tickets?ticket=${ticketId}`,
              metadata: {
                propostaId,
                propostaCode: proposta.code,
                versao: proposta.versao,
                status: StatusProposta.ENVIADA_PARA_GESTAO,
              },
            },
          }),
        ),
      );
    });

    return {
      proposta: await this.findOne(user, ticketId, propostaId),
      ticketStatus: TicketStatus.AGUARDANDO_GESTAO,
      mensagem: 'Proposta enviada para aprovacao da Gestao.',
    };
  }

  async approveByClient(user: AuthUser, ticketId: string, propostaId: string) {
    return this.handleClientDecision(user, ticketId, propostaId, {
      propostaStatus: StatusProposta.APROVADA_PELO_CLIENTE,
      propostaDateField: 'aprovadaPeloClienteEm',
      ticketStatus: TicketStatus.AGUARDANDO_COMERCIAL,
      message: 'O cliente aprovou a proposta.',
      historyTitle: 'Cliente aprovou a proposta',
      notificationTitle: 'Cliente aprovou a proposta',
      notificationMessage:
        'O cliente aprovou a proposta. Envie para aprovacao da Gestao.',
      emailTemplate: 'CLIENTE_APROVOU_PROPOSTA',
      successMessage: 'Proposta aprovada com sucesso.',
      eventType: TicketHistoryEventType.APPROVED,
    });
  }

  async requestClientAdjustment(
    user: AuthUser,
    ticketId: string,
    propostaId: string,
    dto: ClientPropostaDecisionDto,
  ) {
    const motivo = this.sanitize(dto.motivo);

    if (!motivo) {
      throw new BadRequestException('Informe o motivo do ajuste solicitado.');
    }

    return this.handleClientDecision(user, ticketId, propostaId, {
      propostaStatus: StatusProposta.AJUSTE_SOLICITADO_PELO_CLIENTE,
      propostaDateField: 'ajusteSolicitadoPeloClienteEm',
      ticketStatus: TicketStatus.AGUARDANDO_COMERCIAL,
      message: `O cliente solicitou ajuste na proposta: ${motivo}`,
      historyTitle: 'Cliente solicitou ajuste na proposta',
      notificationTitle: 'Cliente solicitou ajuste na proposta',
      notificationMessage:
        'O cliente solicitou ajuste na proposta. Acesse o ticket para revisar.',
      emailTemplate: 'CLIENTE_SOLICITOU_AJUSTE_PROPOSTA',
      successMessage: 'Solicitação de ajuste enviada com sucesso.',
      eventType: TicketHistoryEventType.ADJUSTMENT_REQUESTED,
      motivo,
    });
  }

  async rejectByClient(
    user: AuthUser,
    ticketId: string,
    propostaId: string,
    dto: ClientPropostaDecisionDto,
  ) {
    const motivo = this.sanitize(dto.motivo);

    if (!motivo) {
      throw new BadRequestException('Informe o motivo da recusa.');
    }

    return this.handleClientDecision(user, ticketId, propostaId, {
      propostaStatus: StatusProposta.RECUSADA_PELO_CLIENTE,
      propostaDateField: 'recusadaPeloClienteEm',
      ticketStatus: TicketStatus.REPROVADO,
      message: `O cliente recusou a proposta: ${motivo}`,
      historyTitle: 'Cliente recusou a proposta',
      notificationTitle: 'Cliente recusou a proposta',
      notificationMessage:
        'O cliente recusou a proposta. Acesse o ticket para verificar o motivo.',
      emailTemplate: 'CLIENTE_RECUSOU_PROPOSTA',
      successMessage: 'Proposta recusada com sucesso.',
      eventType: TicketHistoryEventType.REJECTED,
      motivo,
      notifyManagement: true,
    });
  }

  private async handleClientDecision(
    user: AuthUser,
    ticketId: string,
    propostaId: string,
    options: {
      propostaStatus: StatusProposta;
      propostaDateField:
        | 'aprovadaPeloClienteEm'
        | 'ajusteSolicitadoPeloClienteEm'
        | 'recusadaPeloClienteEm';
      ticketStatus: TicketStatus;
      message: string;
      historyTitle: string;
      notificationTitle: string;
      notificationMessage: string;
      emailTemplate: string;
      successMessage: string;
      eventType: TicketHistoryEventType;
      motivo?: string;
      notifyManagement?: boolean;
    },
  ) {
    this.ensureClientUser(user);
    const ticket = await this.getTicketOrThrow(ticketId, user);
    const proposta = await this.prisma.proposta.findFirst({
      where: {
        id: propostaId,
        ticketId,
      },
    });

    if (!proposta) {
      throw new NotFoundException('Proposta nao encontrada.');
    }

    if (proposta.status !== StatusProposta.ENVIADA_AO_CLIENTE) {
      throw new BadRequestException(
        'A proposta não está disponível para decisão do cliente.',
      );
    }

    if (
      options.propostaStatus === StatusProposta.APROVADA_PELO_CLIENTE &&
      proposta.validaAte &&
      proposta.validaAte.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'Esta proposta expirou. Solicite uma nova análise.',
      );
    }

    const commercialRecipients = await this.getCommercialRecipients(ticket);
    const recipients = options.notifyManagement
      ? Array.from(
          new Map(
            [
              ...commercialRecipients,
              ...(await this.getManagementRecipients()),
            ].map((recipient) => [recipient.userId, recipient]),
          ).values(),
        )
      : commercialRecipients;
    const now = new Date();
    const previousTicketStatus = ticket.status;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedProposta = await tx.proposta.update({
        where: { id: propostaId },
        data: {
          status: options.propostaStatus,
          [options.propostaDateField]: now,
          motivoRecusaCliente:
            options.propostaStatus === StatusProposta.RECUSADA_PELO_CLIENTE
              ? (options.motivo ?? null)
              : proposta.motivoRecusaCliente,
        },
        include: this.includePropostaRelations(user),
      });

      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: options.ticketStatus,
          requiresActionRole: this.getActionRole(options.ticketStatus),
          lastInteractionAt: now,
        },
        select: {
          status: true,
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId,
          senderType: MessageSenderType.CLIENTE,
          message: options.message,
          createdById: user.sub,
        },
      });

      const propostaChat = await this.chatsService.ensurePropostaChat(tx, {
        propostaId,
        code: proposta.code,
        ticketId,
        actorId: user.sub,
        clientId: proposta.clientId,
        clientUserId: ticket.client?.userId,
        quoteId: proposta.quoteId,
        criadaPorId: proposta.criadaPorId,
        enviadaPorId: proposta.enviadaPorId,
        assignedToId: ticket.assignedToId,
        requesterId: ticket.requesterId,
      });
      const ticketChat = await this.chatsService.ensureTicketChat(tx, {
        ticketId,
        subject: ticket.subject,
        actorId: user.sub,
        requesterId: ticket.requesterId,
        assignedToId: ticket.assignedToId,
        clientId: ticket.clientId,
        clientUserId: ticket.client?.userId,
        leadId: ticket.leadId,
        quoteId: ticket.quoteId,
        internalOnly: ticket.internalOnly,
      });

      await this.chatsService.createMessageInTransaction(tx, {
        chatId: propostaChat.id,
        authorId: user.sub,
        content: options.message,
        visibility: ChatMessageVisibility.PUBLICA_CLIENTE,
      });
      await this.chatsService.createMessageInTransaction(tx, {
        chatId: ticketChat.id,
        authorId: user.sub,
        content: options.message,
        visibility: ChatMessageVisibility.PUBLICA_CLIENTE,
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          eventType: options.eventType,
          title: options.historyTitle,
          description: options.message,
          createdById: user.sub,
          metadata: {
            propostaId,
            versao: proposta.versao,
            motivo: options.motivo ?? null,
            ticketStatusAnterior: previousTicketStatus,
            ticketStatusNovo: options.ticketStatus,
            propostaStatus: options.propostaStatus,
          },
        },
      });

      const notifications = await Promise.all(
        recipients.map((recipient) =>
          tx.notification.create({
            data: {
              userId: recipient.userId,
              ticketId,
              title: options.notificationTitle,
              message: options.notificationMessage,
              link: `/tickets?ticket=${ticketId}`,
              metadata: {
                propostaId,
                versao: proposta.versao,
                status: options.propostaStatus,
              },
            },
          }),
        ),
      );

      const logEmails = await Promise.all(
        recipients.map((recipient, index) =>
          tx.logEmail.create({
            data: {
              ticketId,
              propostaId,
              notificationId: notifications[index]?.id ?? null,
              userId: recipient.userId,
              emailDestino: recipient.email,
              assunto: options.notificationTitle,
              resumo: options.notificationMessage,
              template: options.emailTemplate,
              status: StatusLogEmail.PENDENTE,
            },
          }),
        ),
      );

      return {
        proposta: updatedProposta,
        ticketStatus: updatedTicket.status,
        logEmails,
      };
    });

    if (options.propostaStatus === StatusProposta.RECUSADA_PELO_CLIENTE) {
      await this.auditLogsService.create({
        category: AuditLogCategory.TICKET,
        action: AuditLogAction.PROPOSAL_REJECTED,
        message: `Cliente recusou a proposta: ${proposta.code}.`,
        targetType: 'Proposta',
        targetId: propostaId,
        userId: user.sub,
        details: {
          ticketId,
          propostaId,
          motivo: options.motivo ?? null,
          notifiedUserIds: recipients.map((recipient) => recipient.userId),
        },
      });
    }

    await this.deliverDecisionEmails({
      ticketId,
      propostaId,
      actorId: user.sub,
      recipients: recipients.map((recipient, index) => ({
        ...recipient,
        logEmailId: result.logEmails[index]?.id,
      })),
      subject: options.notificationTitle,
      message: options.notificationMessage,
      link: `/tickets?ticket=${ticketId}`,
    });

    return {
      proposta: result.proposta,
      ticketStatus: result.ticketStatus,
      mensagem: options.successMessage,
    };
  }

  async approveByManagement(
    user: AuthUser,
    ticketId: string,
    propostaId: string,
  ) {
    this.ensureManagementUser(user);
    return this.handleManagementDecision(user, ticketId, propostaId, {
      propostaStatus: StatusProposta.APROVADA_PELA_GESTAO,
      propostaDateField: 'aprovadaPelaGestaoEm',
      ticketStatus: TicketStatus.APROVADO_GESTAO,
      historyTitle: 'Gestao aprovou a proposta',
      message: 'A Gestao aprovou a proposta formal.',
      notificationTitle: 'Gestao aprovou a proposta',
      notificationMessage:
        'A Gestao aprovou a proposta. O retorno esta disponivel para o Comercial.',
      emailTemplate: 'GESTAO_APROVOU_PROPOSTA',
      successMessage: 'Proposta aprovada pela Gestao.',
      eventType: TicketHistoryEventType.APPROVED,
    });
  }

  async requestManagementAdjustment(
    user: AuthUser,
    ticketId: string,
    propostaId: string,
    dto: ManagementPropostaDecisionDto,
  ) {
    this.ensureManagementUser(user);
    const motivo = this.sanitize(dto.motivo);

    if (!motivo) {
      throw new BadRequestException('Informe o motivo do ajuste solicitado.');
    }

    return this.handleManagementDecision(user, ticketId, propostaId, {
      propostaStatus: StatusProposta.AJUSTE_SOLICITADO_PELA_GESTAO,
      propostaDateField: 'ajusteSolicitadoPelaGestaoEm',
      ticketStatus: TicketStatus.AJUSTE_SOLICITADO,
      historyTitle: 'Gestao solicitou ajuste na proposta',
      message: `A Gestao solicitou ajuste na proposta: ${motivo}`,
      notificationTitle: 'Gestao solicitou ajuste na proposta',
      notificationMessage:
        'A Gestao solicitou ajuste na proposta. O retorno foi enviado ao Comercial.',
      emailTemplate: 'GESTAO_SOLICITOU_AJUSTE_PROPOSTA',
      successMessage: 'Ajuste solicitado ao Comercial.',
      eventType: TicketHistoryEventType.ADJUSTMENT_REQUESTED,
      motivo,
    });
  }

  async rejectByManagement(
    user: AuthUser,
    ticketId: string,
    propostaId: string,
    dto: ManagementPropostaDecisionDto,
  ) {
    this.ensureManagementUser(user);
    const motivo = this.sanitize(dto.motivo);

    if (!motivo) {
      throw new BadRequestException('Informe o motivo da recusa.');
    }

    return this.handleManagementDecision(user, ticketId, propostaId, {
      propostaStatus: StatusProposta.RECUSADA_PELA_GESTAO,
      propostaDateField: 'recusadaPelaGestaoEm',
      ticketStatus: TicketStatus.REPROVADO,
      historyTitle: 'Gestao recusou a proposta',
      message: `A Gestao recusou a proposta: ${motivo}`,
      notificationTitle: 'Gestao recusou a proposta',
      notificationMessage:
        'A Gestao recusou a proposta. O retorno foi enviado ao Comercial.',
      emailTemplate: 'GESTAO_RECUSOU_PROPOSTA',
      successMessage: 'Proposta recusada pela Gestao.',
      eventType: TicketHistoryEventType.REJECTED,
      motivo,
    });
  }

  private async handleManagementDecision(
    user: AuthUser,
    ticketId: string,
    propostaId: string,
    options: {
      propostaStatus: StatusProposta;
      propostaDateField:
        | 'aprovadaPelaGestaoEm'
        | 'ajusteSolicitadoPelaGestaoEm'
        | 'recusadaPelaGestaoEm';
      ticketStatus: TicketStatus;
      historyTitle: string;
      message: string;
      notificationTitle: string;
      notificationMessage: string;
      emailTemplate: string;
      successMessage: string;
      eventType: TicketHistoryEventType;
      motivo?: string;
    },
  ) {
    const ticket = await this.getTicketOrThrow(ticketId, user);
    const proposta = await this.prisma.proposta.findFirst({
      where: {
        id: propostaId,
        ticketId,
      },
    });

    if (!proposta) {
      throw new NotFoundException('Proposta nao encontrada.');
    }

    if (proposta.status !== StatusProposta.ENVIADA_PARA_GESTAO) {
      throw new BadRequestException(
        'A proposta nao esta aguardando decisao da Gestao.',
      );
    }

    const recipients = await this.getCommercialRecipients(ticket);
    const now = new Date();
    const previousTicketStatus = ticket.status;
    let approvedNegotiatedValue: Prisma.Decimal | null = null;

    if (options.propostaStatus === StatusProposta.APROVADA_PELA_GESTAO) {
      approvedNegotiatedValue = proposta.valor;

      if (
        (!approvedNegotiatedValue || approvedNegotiatedValue.lte(0)) &&
        proposta.quoteId
      ) {
        const quote = await this.prisma.quote.findUnique({
          where: { id: proposta.quoteId },
          select: {
            price: true,
          },
        });

        approvedNegotiatedValue = quote?.price ?? null;
      }

      if (!approvedNegotiatedValue || approvedNegotiatedValue.lte(0)) {
        throw new BadRequestException(
          'Informe o valor do servico negociado antes de aprovar a proposta.',
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedProposta = await tx.proposta.update({
        where: { id: propostaId },
        data: {
          status: options.propostaStatus,
          [options.propostaDateField]: now,
        },
        include: this.includePropostaRelations(user),
      });

      if (
        options.propostaStatus === StatusProposta.APROVADA_PELA_GESTAO &&
        proposta.opportunityId &&
        approvedNegotiatedValue
      ) {
        await tx.opportunity.update({
          where: { id: proposta.opportunityId },
          data: {
            value: approvedNegotiatedValue,
            stage: OpportunityStage.GANHO,
            status: OpportunityStatus.WON,
          },
        });
      }

      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          type:
            options.propostaStatus ===
            StatusProposta.AJUSTE_SOLICITADO_PELA_GESTAO
              ? TicketType.AJUSTE_GESTAO
              : ticket.type,
          status: options.ticketStatus,
          requiresActionRole: this.getActionRole(options.ticketStatus),
          lastInteractionAt: now,
        },
        select: {
          status: true,
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId,
          senderType: MessageSenderType.INTERNO,
          message: options.message,
          isInternal: true,
          createdById: user.sub,
        },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          eventType: options.eventType,
          title: options.historyTitle,
          description: options.message,
          internalOnly: true,
          createdById: user.sub,
          metadata: {
            propostaId,
            propostaCode: proposta.code,
            versao: proposta.versao,
            motivo: options.motivo ?? null,
            ticketStatusAnterior: previousTicketStatus,
            ticketStatusNovo: options.ticketStatus,
            propostaStatus: options.propostaStatus,
          },
        },
      });

      const notifications = await Promise.all(
        recipients.map((recipient) =>
          tx.notification.create({
            data: {
              userId: recipient.userId,
              ticketId,
              title: options.notificationTitle,
              message: options.notificationMessage,
              link: `/tickets?ticket=${ticketId}`,
              metadata: {
                propostaId,
                propostaCode: proposta.code,
                versao: proposta.versao,
                status: options.propostaStatus,
              },
            },
          }),
        ),
      );

      const logEmails = await Promise.all(
        recipients.map((recipient, index) =>
          tx.logEmail.create({
            data: {
              ticketId,
              propostaId,
              notificationId: notifications[index]?.id ?? null,
              userId: recipient.userId,
              emailDestino: recipient.email,
              assunto: options.notificationTitle,
              resumo: options.notificationMessage,
              template: options.emailTemplate,
              status: StatusLogEmail.PENDENTE,
            },
          }),
        ),
      );

      return {
        proposta: updatedProposta,
        ticketStatus: updatedTicket.status,
        logEmails,
      };
    });

    await this.deliverDecisionEmails({
      ticketId,
      propostaId,
      actorId: user.sub,
      recipients: recipients.map((recipient, index) => ({
        ...recipient,
        logEmailId: result.logEmails[index]?.id,
      })),
      subject: options.notificationTitle,
      message: options.notificationMessage,
      link: `/tickets?ticket=${ticketId}`,
    });

    return {
      proposta: result.proposta,
      ticketStatus: result.ticketStatus,
      mensagem: options.successMessage,
    };
  }

  private async getCommercialRecipients(ticket: TicketWithAccessData) {
    if (ticket.assignedTo) {
      return [
        {
          userId: ticket.assignedTo.id,
          name: ticket.assignedTo.name,
          email: ticket.assignedTo.email,
        },
      ];
    }

    const users = await this.prisma.user.findMany({
      where: {
        role: PrismaUserRole.COMERCIAL,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return users.map((recipient) => ({
      userId: recipient.id,
      name: recipient.name,
      email: recipient.email,
    }));
  }

  private async getManagementRecipients() {
    const users = await this.prisma.user.findMany({
      where: {
        role: {
          in: [PrismaUserRole.GESTAO, PrismaUserRole.ADMIN],
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return users.map((recipient) => ({
      userId: recipient.id,
      name: recipient.name,
      email: recipient.email,
    }));
  }

  private async deliverDecisionEmails(input: {
    ticketId: string;
    propostaId: string;
    actorId: string;
    recipients: Array<EmailRecipient & { logEmailId?: string }>;
    subject: string;
    link: string;
    message: string;
  }) {
    await Promise.all(
      input.recipients
        .filter((recipient) => Boolean(recipient.logEmailId))
        .map((recipient) =>
          this.deliverProposalEmail({
            ticketId: input.ticketId,
            propostaId: input.propostaId,
            logEmailId: recipient.logEmailId as string,
            actorId: input.actorId,
            recipient,
            subject: input.subject,
            link: input.link,
            message: input.message,
          }),
        ),
    );
  }

  private async deliverProposalEmail(input: {
    ticketId: string;
    propostaId: string;
    logEmailId: string;
    actorId: string;
    recipient: {
      name: string;
      email: string;
    };
    subject: string;
    link: string;
    message: string;
  }) {
    const webhookUrl = process.env.EMAIL_WEBHOOK_URL;

    if (!webhookUrl) {
      await this.prisma.$transaction([
        this.prisma.logEmail.update({
          where: { id: input.logEmailId },
          data: {
            status: StatusLogEmail.IGNORADO,
            mensagemErro: 'EMAIL_WEBHOOK_URL nao configurado.',
          },
        }),
        this.prisma.ticketHistory.create({
          data: {
            ticketId: input.ticketId,
            eventType: TicketHistoryEventType.EMAIL_SENT,
            title: 'Envio de e-mail ignorado',
            description: 'EMAIL_WEBHOOK_URL nao configurado.',
            createdById: input.actorId,
            metadata: {
              propostaId: input.propostaId,
              logEmailId: input.logEmailId,
              delivery: 'ignored_without_provider',
            },
          },
        }),
      ]);
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: [
            {
              name: input.recipient.name,
              email: input.recipient.email,
            },
          ],
          subject: input.subject,
          title: input.subject,
          message: input.message,
          summary: input.message,
          link: input.link,
          ticketId: input.ticketId,
          propostaId: input.propostaId,
          actorId: input.actorId,
          sentAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorMessage = `Webhook de e-mail retornou status ${response.status}.`;
        await this.registerEmailFailure(input, errorMessage);
        return;
      }

      const providerMessageId = response.headers.get('x-message-id');
      const sentAt = new Date();

      await this.prisma.$transaction([
        this.prisma.logEmail.update({
          where: { id: input.logEmailId },
          data: {
            status: StatusLogEmail.ENVIADO,
            enviadoEm: sentAt,
            provedor: 'webhook',
            idMensagemProvedor: providerMessageId,
          },
        }),
        this.prisma.ticketHistory.create({
          data: {
            ticketId: input.ticketId,
            eventType: TicketHistoryEventType.EMAIL_SENT,
            title: 'E-mail enviado',
            description: input.message,
            createdById: input.actorId,
            metadata: {
              propostaId: input.propostaId,
              logEmailId: input.logEmailId,
              delivery: 'webhook_sent',
            },
          },
        }),
      ]);
    } catch (error) {
      await this.registerEmailFailure(
        input,
        error instanceof Error
          ? error.message
          : 'Falha desconhecida no envio de e-mail.',
      );
    }
  }

  private async registerEmailFailure(
    input: {
      ticketId: string;
      propostaId: string;
      logEmailId: string;
      actorId: string;
      message: string;
    },
    errorMessage: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.logEmail.update({
        where: { id: input.logEmailId },
        data: {
          status: StatusLogEmail.FALHOU,
          mensagemErro: errorMessage,
          provedor: 'webhook',
        },
      }),
      this.prisma.ticketHistory.create({
        data: {
          ticketId: input.ticketId,
          eventType: TicketHistoryEventType.EMAIL_SENT,
          title: 'Falha no envio de e-mail',
          description: errorMessage,
          createdById: input.actorId,
          metadata: {
            propostaId: input.propostaId,
            logEmailId: input.logEmailId,
            delivery: 'webhook_failed',
          },
        },
      }),
    ]);
  }
}
