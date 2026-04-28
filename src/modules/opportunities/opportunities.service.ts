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
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
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

  async updateStage(user: AuthUser, id: string, dto: UpdateOpportunityStageDto) {
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
          lostReason:
            dto.stage === OpportunityStage.PERDIDO
              ? dto.lostReason?.trim() ?? null
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
                ? dto.lostReason?.trim() ?? null
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
            ? dto.lostReason?.trim() ?? null
            : null,
      },
    });

    return updatedOpportunity;
  }
}
