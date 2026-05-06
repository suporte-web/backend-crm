import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditLogAction,
  AuditLogCategory,
  OpportunityStage,
  OpportunityStatus,
  Prisma,
  StatusProposta,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { UpdateOpportunityStageDto } from './dto/update-opportunity-stage.dto';

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private ensureInternalUser(user: AuthUser) {
    const allowedRoles = ['ADMIN', 'GESTAO', 'COMERCIAL'];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Voce nao tem permissao para acessar este recurso.',
      );
    }
  }

  private mapStageToStatus(stage: OpportunityStage): OpportunityStatus {
    if (stage === OpportunityStage.GANHO) {
      return OpportunityStatus.WON;
    }

    if (stage === OpportunityStage.PERDIDO) {
      return OpportunityStatus.LOST;
    }

    return OpportunityStatus.OPEN;
  }

  private isPositiveDecimal(value: Prisma.Decimal | null | undefined) {
    return value !== null && value !== undefined && value.gt(0);
  }

  private sanitize(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private async resolveNegotiatedValueForGain(opportunity: {
    id: string;
    quoteId?: string | null;
    value?: Prisma.Decimal | null;
  }) {
    if (this.isPositiveDecimal(opportunity.value)) {
      return opportunity.value;
    }

    const latestProposta = await this.prisma.proposta.findFirst({
      where: {
        opportunityId: opportunity.id,
        valor: {
          not: null,
        },
        status: {
          notIn: [
            StatusProposta.RASCUNHO,
            StatusProposta.CANCELADA,
            StatusProposta.EXPIRADA,
          ],
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

    const latestPropostaValue = latestProposta?.valor;

    if (this.isPositiveDecimal(latestPropostaValue)) {
      return latestPropostaValue;
    }

    if (opportunity.quoteId) {
      const quote = await this.prisma.quote.findUnique({
        where: { id: opportunity.quoteId },
        select: {
          price: true,
        },
      });

      const quotePrice = quote?.price;

      if (this.isPositiveDecimal(quotePrice)) {
        return quotePrice;
      }
    }

    return null;
  }

  async create(user: AuthUser, dto: CreateOpportunityDto) {
    this.ensureInternalUser(user);

    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
      include: {
        user: true,
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    if (dto.quoteId) {
      const quote = await this.prisma.quote.findUnique({
        where: { id: dto.quoteId },
        select: {
          id: true,
          clientId: true,
        },
      });

      if (!quote || quote.clientId !== dto.clientId) {
        throw new BadRequestException('Cotacao invalida para este cliente.');
      }
    }

    const stage = dto.stage ?? OpportunityStage.NOVO;

    const createdOpportunity = await this.prisma.$transaction(async (tx) => {
      const opportunity = await tx.opportunity.create({
        data: {
          clientId: dto.clientId,
          quoteId: dto.quoteId,
          title: dto.title,
          value:
            dto.value !== undefined ? new Prisma.Decimal(dto.value) : undefined,
          stage,
          status: this.mapStageToStatus(stage),
          preContract: dto.preContract ?? false,
          preContractNotes: dto.preContractNotes,
          expectedCloseDate: dto.expectedCloseDate
            ? new Date(dto.expectedCloseDate)
            : null,
        },
      });

      await tx.timelineEvent.create({
        data: {
          clientId: dto.clientId,
          type: TimelineEventType.OPPORTUNITY_CREATED,
          title: 'Oportunidade criada',
          description: `A oportunidade "${dto.title}" foi registrada para ${client.companyName ?? client.user.name}.`,
          createdById: user.sub,
          metadata: {
            opportunityId: opportunity.id,
            stage,
          },
        },
      });

      return opportunity;
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.CLIENT,
      action: AuditLogAction.OPPORTUNITY_CREATED,
      message: `Oportunidade criada: ${dto.title}.`,
      targetType: 'Opportunity',
      targetId: createdOpportunity.id,
      userId: user.sub,
      details: {
        clientId: dto.clientId,
        quoteId: dto.quoteId ?? null,
        preContract: dto.preContract ?? false,
      },
    });

    return createdOpportunity;
  }

  async findAll(
    user: AuthUser,
    filters: { clientId?: string; stage?: string; status?: string },
  ) {
    this.ensureInternalUser(user);

    const where: {
      clientId?: string;
      stage?: OpportunityStage;
      status?: OpportunityStatus;
      client?: {
        internalOwnerId: string;
      };
    } = {};

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.stage) {
      const stage = filters.stage as OpportunityStage;

      if (!Object.values(OpportunityStage).includes(stage)) {
        throw new BadRequestException('Etapa da oportunidade invalida.');
      }

      where.stage = stage;
    }

    if (filters.status) {
      const status = filters.status as OpportunityStatus;

      if (!Object.values(OpportunityStatus).includes(status)) {
        throw new BadRequestException('Status da oportunidade invalido.');
      }

      where.status = status;
    }

    if (user.role === 'COMERCIAL') {
      where.client = {
        internalOwnerId: user.sub,
      };
    }

    return this.prisma.opportunity.findMany({
      where,
      include: {
        client: {
          include: {
            user: true,
          },
        },
        quote: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async updateStage(
    user: AuthUser,
    id: string,
    dto: UpdateOpportunityStageDto,
  ) {
    this.ensureInternalUser(user);

    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Oportunidade nao encontrada.');
    }

    if (dto.stage === OpportunityStage.PERDIDO && !dto.lostReason?.trim()) {
      throw new BadRequestException(
        'Informe o motivo da perda ao marcar a oportunidade como perdida.',
      );
    }

    const negotiatedValue =
      dto.stage === OpportunityStage.GANHO
        ? await this.resolveNegotiatedValueForGain(opportunity)
        : null;

    if (dto.stage === OpportunityStage.GANHO && !negotiatedValue) {
      throw new BadRequestException(
        'Informe o valor do servico negociado antes de marcar a oportunidade como ganha.',
      );
    }

    const nextStatus = this.mapStageToStatus(dto.stage);
    const eventType =
      dto.stage === OpportunityStage.GANHO
        ? TimelineEventType.OPPORTUNITY_WON
        : dto.stage === OpportunityStage.PERDIDO
          ? TimelineEventType.OPPORTUNITY_LOST
          : TimelineEventType.STAGE_CHANGED;
    const eventTitle =
      dto.stage === OpportunityStage.GANHO
        ? 'Oportunidade ganha'
        : dto.stage === OpportunityStage.PERDIDO
          ? 'Oportunidade perdida'
          : 'Mudanca de etapa';
    const eventDescription =
      dto.stage === OpportunityStage.GANHO
        ? `A oportunidade "${opportunity.title}" foi marcada como ganha.`
        : dto.stage === OpportunityStage.PERDIDO
          ? `A oportunidade "${opportunity.title}" foi marcada como perdida.`
          : `A oportunidade "${opportunity.title}" avancou para ${dto.stage}.`;

    const updatedOpportunity = await this.prisma.$transaction(async (tx) => {
      const updatedOpportunity = await tx.opportunity.update({
        where: { id },
        data: {
          stage: dto.stage,
          status: nextStatus,
          ...(negotiatedValue ? { value: negotiatedValue } : {}),
          lostReason:
            dto.stage === OpportunityStage.PERDIDO
              ? (dto.lostReason?.trim() ?? null)
              : null,
        },
      });

      await tx.timelineEvent.create({
        data: {
          clientId: opportunity.clientId,
          type: eventType,
          title: eventTitle,
          description: eventDescription,
          createdById: user.sub,
          metadata: {
            opportunityId: opportunity.id,
            from: opportunity.stage,
            to: dto.stage,
            lostReason:
              dto.stage === OpportunityStage.PERDIDO
                ? (dto.lostReason?.trim() ?? null)
                : null,
          },
        },
      });

      return updatedOpportunity;
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.CLIENT,
      action: AuditLogAction.OPPORTUNITY_STAGE_CHANGED,
      message: `Etapa da oportunidade alterada para ${dto.stage}.`,
      targetType: 'Opportunity',
      targetId: id,
      userId: user.sub,
      details: {
        from: opportunity.stage,
        to: dto.stage,
        lostReason:
          dto.stage === OpportunityStage.PERDIDO
            ? (dto.lostReason?.trim() ?? null)
            : null,
      },
    });

    return updatedOpportunity;
  }

  async update(user: AuthUser, id: string, dto: UpdateOpportunityDto) {
    this.ensureInternalUser(user);

    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Oportunidade nao encontrada.');
    }

    const nextTitle =
      dto.title !== undefined ? this.sanitize(dto.title) : undefined;

    if (dto.title !== undefined && !nextTitle) {
      throw new BadRequestException('Informe o titulo da oportunidade.');
    }

    if (dto.quoteId) {
      const quote = await this.prisma.quote.findUnique({
        where: { id: dto.quoteId },
        select: {
          id: true,
          clientId: true,
        },
      });

      if (!quote || quote.clientId !== opportunity.clientId) {
        throw new BadRequestException('Cotacao invalida para este cliente.');
      }
    }

    const nextStage = dto.stage ?? opportunity.stage;
    const nextLostReason =
      nextStage === OpportunityStage.PERDIDO
        ? (this.sanitize(dto.lostReason) ?? opportunity.lostReason ?? null)
        : null;

    if (nextStage === OpportunityStage.PERDIDO) {
      if (!nextLostReason) {
        throw new BadRequestException(
          'Informe o motivo da perda ao marcar a oportunidade como perdida.',
        );
      }
    }

    const changedFields = [
      nextTitle !== undefined && nextTitle !== opportunity.title
        ? 'titulo'
        : null,
      dto.quoteId !== undefined && dto.quoteId !== opportunity.quoteId
        ? 'cotacao'
        : null,
      dto.value !== undefined &&
      String(dto.value ?? '') !== String(opportunity.value ?? '')
        ? 'valor'
        : null,
      dto.stage !== undefined && dto.stage !== opportunity.stage
        ? 'etapa'
        : null,
      dto.expectedCloseDate !== undefined &&
      String(dto.expectedCloseDate ?? '') !==
        String(opportunity.expectedCloseDate ?? '')
        ? 'previsao de fechamento'
        : null,
      dto.preContract !== undefined &&
      dto.preContract !== opportunity.preContract
        ? 'pre-contrato'
        : null,
      dto.preContractNotes !== undefined &&
      this.sanitize(dto.preContractNotes) !== opportunity.preContractNotes
        ? 'observacoes do pre-contrato'
        : null,
      dto.lostReason !== undefined &&
      this.sanitize(dto.lostReason) !== opportunity.lostReason
        ? 'motivo da perda'
        : null,
    ].filter(Boolean);

    const updateData: Prisma.OpportunityUncheckedUpdateInput = {
      ...(nextTitle !== undefined ? { title: nextTitle as string } : {}),
      ...(dto.quoteId !== undefined ? { quoteId: dto.quoteId } : {}),
      ...(dto.value !== undefined
        ? {
            value: dto.value === null ? null : new Prisma.Decimal(dto.value),
          }
        : {}),
      ...(dto.stage !== undefined
        ? {
            stage: dto.stage,
            status: this.mapStageToStatus(dto.stage),
          }
        : {}),
      ...(dto.expectedCloseDate !== undefined
        ? {
            expectedCloseDate: dto.expectedCloseDate
              ? new Date(dto.expectedCloseDate)
              : null,
          }
        : {}),
      ...(dto.preContract !== undefined ? { preContract: dto.preContract } : {}),
      ...(dto.preContractNotes !== undefined
        ? { preContractNotes: this.sanitize(dto.preContractNotes) }
        : {}),
      ...(dto.stage !== undefined || dto.lostReason !== undefined
        ? { lostReason: nextLostReason }
        : {}),
    };

    const updatedOpportunity = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.opportunity.update({
        where: { id },
        data: updateData,
        include: {
          client: {
            include: {
              user: true,
            },
          },
          quote: true,
        },
      });

      if (changedFields.length > 0) {
        await tx.timelineEvent.create({
          data: {
            clientId: opportunity.clientId,
            type: TimelineEventType.NOTE_ADDED,
            title: 'Oportunidade editada',
            description: `Campos atualizados: ${changedFields.join(', ')}.`,
            createdById: user.sub,
            metadata: {
              opportunityId: id,
              changedFields,
            },
          },
        });
      }

      return updated;
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.CLIENT,
      action: AuditLogAction.CUSTOM,
      message: `Oportunidade editada: ${updatedOpportunity.title}.`,
      targetType: 'Opportunity',
      targetId: id,
      userId: user.sub,
      details: {
        changedFields,
      },
    });

    return updatedOpportunity;
  }
}
