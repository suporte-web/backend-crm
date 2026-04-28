import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MessageSenderType,
  Prisma,
  StatusLogEmail,
  StatusProposta,
  TicketHistoryEventType,
  TicketStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ClientPropostaDecisionDto } from './dto/client-proposta-decision.dto';
import { CreatePropostaDto } from './dto/create-proposta.dto';
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
  constructor(private readonly prisma: PrismaService) {}

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

  private sanitize(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
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
      if (ticket.client?.userId !== user.sub) {
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
    const data: Prisma.PropostaUpdateInput = {};

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
      data.valor = dto.valor;
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
      data.validadeDias = dto.validadeDias;
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

  async create(user: AuthUser, ticketId: string, dto: CreatePropostaDto) {
    this.ensureInternalUser(user);
    const ticket = await this.getTicketOrThrow(ticketId, user);
    const data = this.buildPropostaData(dto);

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

      await tx.ticketHistory.create({
        data: {
          ticketId,
          eventType: TicketHistoryEventType.CREATED,
          title: 'Proposta criada',
          description: `Proposta v${versao} criada em rascunho.`,
          createdById: user.sub,
          metadata: {
            propostaId: created.id,
            versao,
            status: created.status,
          },
        },
      });

      return created;
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
  ) {
    this.ensureInternalUser(user);
    const proposta = await this.getPropostaOrThrow(user, ticketId, propostaId);

    if (!PROPOSTA_EDITAVEL.includes(proposta.status)) {
      throw new BadRequestException(
        'Esta proposta nao pode ser editada no status atual.',
      );
    }

    const data = this.buildPropostaData(dto);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.proposta.update({
        where: { id: propostaId },
        data,
        include: this.includePropostaRelations(user),
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

  async sendToClient(user: AuthUser, ticketId: string, propostaId: string) {
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

    const now = new Date();
    const link = `/tickets?ticket=${ticketId}`;
    const emailSubject = 'Proposta disponivel para analise';

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedProposta = await tx.proposta.update({
        where: { id: propostaId },
        data: {
          status: StatusProposta.ENVIADA_AO_CLIENTE,
          enviadaEm: now,
          enviadaPorId: user.sub,
        },
        include: this.includePropostaRelations(user),
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
          createdById: user.sub,
        },
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

    return this.findOne(user, ticketId, propostaId);
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

    const recipients = await this.getCommercialRecipients(ticket);
    const now = new Date();
    const previousTicketStatus = ticket.status;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedProposta = await tx.proposta.update({
        where: { id: propostaId },
        data: {
          status: options.propostaStatus,
          [options.propostaDateField]: now,
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
