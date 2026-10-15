import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hasAnyRole } from '../../common/user-roles';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { DecideLeadDeletionDto } from './dto/decide-lead-deletion.dto';
import { RequestLeadDeletionDto } from './dto/request-lead-deletion.dto';

const approvers = ['ADMIN', 'GESTAO', 'COMERCIAL'];
const person = { id: true, name: true, email: true } as const;
const journey = {
  convertedClients: { select: { id: true } },
  originatedProspects: { select: { id: true } },
} satisfies Prisma.LeadInclude;
type Journey = Prisma.LeadGetPayload<{ include: typeof journey }>;

@Injectable()
export class ExclusoesLeadsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureApprover(user: AuthUser) {
    if (!hasAnyRole(user, approvers))
      throw new ForbiddenException(
        'Somente Comercial, Gestão ou Admin podem analisar solicitações de exclusão de leads.',
      );
  }

  private ensureNoConversion(lead: Journey) {
    if (
      lead.convertidoParaCliente ||
      lead.convertedProspectId ||
      lead.convertedClients.length ||
      lead.originatedProspects.length
    ) {
      throw new ConflictException(
        'Este lead possui uma conversão vinculada. Preserve o histórico comercial.',
      );
    }
  }

  async listar(user: AuthUser) {
    this.ensureApprover(user);
    return this.prisma.leadDeletionRequest.findMany({
      where: { status: 'PENDENTE' },
      include: { requestedBy: { select: person } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  async solicitar(user: AuthUser, id: string, dto: RequestLeadDeletionDto) {
    if (!hasAnyRole(user, ['CONSULTORA']))
      throw new ForbiddenException(
        'A solicitação de exclusão é destinada ao perfil Consultora.',
      );
    const reason = dto.reason?.trim();
    if (!reason)
      throw new BadRequestException(
        'Informe o motivo da solicitação de exclusão.',
      );
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // A autoria é verificada com o ID autenticado, nunca com IDs do corpo.
          const lead = await tx.lead.findFirst({
            where: { id, createdById: user.sub },
            include: journey,
          });
          if (!lead) throw new NotFoundException('Lead não encontrado.');
          this.ensureNoConversion(lead);
          const pending = await tx.leadDeletionRequest.findFirst({
            where: { leadId: id, status: 'PENDENTE' },
          });
          if (pending) return pending;
          const created = await tx.leadDeletionRequest.create({
            data: {
              leadId: id,
              requestedById: user.sub,
              reason,
              leadNameSnapshot: lead.company || lead.name,
              leadEmailSnapshot: lead.email,
            },
          });
          await tx.leadTimelineEvent.create({
            data: {
              leadId: id,
              type: 'UPDATED',
              title: 'Exclusão solicitada',
              description: reason,
              createdById: user.sub,
              metadata: { deletionRequestId: created.id },
            },
          });
          await tx.auditLog.create({
            data: {
              category: 'CLIENT',
              action: 'CUSTOM',
              userId: user.sub,
              targetType: 'LeadDeletionRequest',
              targetId: created.id,
              message: 'Solicitação de exclusão de lead criada.',
              details: { leadId: id, reason },
            },
          });
          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2034'].includes(error.code)
      ) {
        const pending = await this.prisma.leadDeletionRequest.findFirst({
          where: { leadId: id, requestedById: user.sub, status: 'PENDENTE' },
        });
        if (pending) return pending;
        throw new ConflictException(
          'O cadastro foi alterado por outra operação. Atualize a tela e tente novamente.',
        );
      }
      throw error;
    }
  }

  async decidir(user: AuthUser, id: string, dto: DecideLeadDeletionDto) {
    this.ensureApprover(user);
    if (!['APPROVE', 'REJECT'].includes(dto.action))
      throw new BadRequestException('Decisão inválida.');
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const pending = await tx.leadDeletionRequest.findUnique({
            where: { id },
          });
          if (!pending)
            throw new NotFoundException(
              'Solicitação de exclusão de lead não encontrada.',
            );
          if (pending.status !== 'PENDENTE')
            throw new ConflictException('Esta solicitação já foi analisada.');
          if (!pending.leadId)
            throw new ConflictException(
              'O lead da solicitação não está mais disponível.',
            );
          const lead = await tx.lead.findUnique({
            where: { id: pending.leadId },
            include: {
              ...journey,
              timeline: true,
              observations: true,
              anexos: true,
              chats: { include: { messages: true, participants: true } },
            },
          });
          if (!lead) throw new NotFoundException('Lead não encontrado.');
          if (dto.action === 'APPROVE') this.ensureNoConversion(lead);
          const changed = await tx.leadDeletionRequest.updateMany({
            where: { id, status: 'PENDENTE' },
            data: {
              status: dto.action === 'APPROVE' ? 'APROVADA' : 'RECUSADA',
              approvedById: user.sub,
              managementResponse: dto.message?.trim() || null,
              decidedAt: new Date(),
              // Snapshot sobrevive à remoção do lead e preserva observações/interações.
              leadSnapshot:
                dto.action === 'APPROVE' ? JSON.stringify(lead) : undefined,
            },
          });
          if (changed.count !== 1)
            throw new ConflictException('Esta solicitação já foi analisada.');
          if (dto.action === 'APPROVE') {
            // Chamados, conversas e resultados da importação continuam existentes.
            await tx.ticket.updateMany({
              where: { leadId: lead.id },
              data: { leadId: null },
            });
            await tx.chat.updateMany({
              where: { leadId: lead.id },
              data: { leadId: null },
            });
            await tx.leadImportRowResult.updateMany({
              where: { leadId: lead.id },
              data: { leadId: null },
            });
            await tx.lead.delete({ where: { id: lead.id } });
          } else {
            await tx.leadTimelineEvent.create({
              data: {
                leadId: lead.id,
                type: 'UPDATED',
                title: 'Exclusão recusada',
                description:
                  dto.message?.trim() || 'O cadastro será mantido no CRM.',
                createdById: user.sub,
                metadata: { deletionRequestId: id },
              },
            });
          }
          await tx.auditLog.create({
            data: {
              category: 'CLIENT',
              action: 'CUSTOM',
              userId: user.sub,
              targetType: 'LeadDeletionRequest',
              targetId: id,
              message:
                dto.action === 'APPROVE'
                  ? 'Exclusão de lead aprovada.'
                  : 'Exclusão de lead recusada.',
              details: {
                leadId: lead.id,
                action: dto.action,
                reason: pending.reason,
                response: dto.message?.trim() || null,
              },
            },
          });
          return {
            message:
              dto.action === 'APPROVE'
                ? 'Lead excluído com sucesso.'
                : 'Solicitação recusada.',
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'A solicitação foi alterada por outra operação. Atualize a tela e tente novamente.',
        );
      }
      throw error;
    }
  }
}
