import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hasAnyRole } from '../../common/user-roles';
import type { AuthUser } from '../auth/types/auth-user.type';
import { NotificationsService } from '../notifications/notifications.service';
import { EncaminharCotacaoSiteDto, ReprovarCotacaoSiteDto } from './dto/triagem-cotacao-site.dto';

type Solicitacao = Prisma.SolicitacaoSiteGetPayload<{}>;
const TRIAGEM = ['ADMIN', 'GESTAO', 'MARKETING'];
function objeto(value: unknown): Prisma.JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Prisma.JsonObject : {};
}

@Injectable()
export class CotacaoSiteTriagemService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  private autorizar(user: AuthUser) {
    if (!hasAnyRole(user, TRIAGEM)) throw new ForbiddenException('Somente Marketing, Gestão ou Admin pode decidir a triagem do site.');
  }

  async responsaveis(user: AuthUser) {
    this.autorizar(user);
    return this.prisma.user.findMany({
      where: { isActive: true, OR: [{ role: 'COMERCIAL' }, { roles: { has: 'COMERCIAL' } }] },
      select: { id: true, name: true }, orderBy: { name: 'asc' },
    });
  }

  async enriquecer(solicitacao: Solicitacao, tx: Prisma.TransactionClient = this.prisma) {
    if (solicitacao.tipo !== 'COTACAO') return { ...solicitacao, etapaCotacao: null, leadId: null, cadastroId: null, oportunidadeId: null, motivoReprovacao: null, lead: null, responsavel: null };
    const lead = await tx.lead.findFirst({
      where: { source: 'site', metadata: { path: ['solicitacaoSiteId'], equals: solicitacao.id } },
      include: { timeline: { orderBy: { createdAt: 'desc' }, take: 50, include: { createdBy: { select: { id: true, name: true } } } } },
    });
    const triagem = objeto(objeto(lead?.metadata).triagemSite);
    const oportunidadeId = typeof triagem.oportunidadeId === 'string' ? triagem.oportunidadeId : null;
    return {
      ...solicitacao,
      etapaCotacao: oportunidadeId ? 'OPORTUNIDADE' : solicitacao.status === 'REPROVADO' ? 'REPROVADO' : 'LEAD',
      leadId: lead?.id ?? null,
      cadastroId: lead?.cadastroId ?? null,
      oportunidadeId,
      motivoReprovacao: typeof triagem.motivoReprovacao === 'string' ? triagem.motivoReprovacao : null,
      lead,
      responsavel: solicitacao.responsavelId ? await tx.user.findUnique({ where: { id: solicitacao.responsavelId }, select: { id: true, name: true } }) : null,
    };
  }

  podeVisualizar(user: AuthUser, solicitacao: Awaited<ReturnType<CotacaoSiteTriagemService['enriquecer']>>) {
    return solicitacao.tipo !== 'COTACAO' || hasAnyRole(user, TRIAGEM) ||
      (hasAnyRole(user, ['COMERCIAL']) && solicitacao.etapaCotacao === 'OPORTUNIDADE' && solicitacao.responsavelId === user.sub);
  }

  private async carregar(tx: Prisma.TransactionClient, id: string) {
    // A segunda decisão espera a primeira transação e lê o vínculo já persistido.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "SolicitacaoSite" WHERE id = ${id} FOR UPDATE`);
    const solicitacao = await tx.solicitacaoSite.findUnique({ where: { id } });
    if (!solicitacao) throw new NotFoundException('Solicitação não encontrada.');
    if (solicitacao.tipo !== 'COTACAO') throw new BadRequestException('Esta ação é exclusiva para cotações do site.');
    const request = await this.enriquecer(solicitacao, tx);
    if (!request.lead) throw new BadRequestException('O lead desta cotação não foi localizado.');
    return request;
  }

  async encaminhar(user: AuthUser, id: string, dto: EncaminharCotacaoSiteDto) {
    this.autorizar(user);
    return this.prisma.$transaction(async (tx) => {
      const request = await this.carregar(tx, id);
      if (request.oportunidadeId) return { sucesso: true, solicitacao: request };
      if (request.status === 'REPROVADO') throw new BadRequestException('Uma cotação reprovada não pode ser encaminhada.');
      const owner = await tx.user.findUnique({ where: { id: dto.responsavelId } });
      if (!owner?.isActive || !hasAnyRole(owner, ['COMERCIAL'])) throw new BadRequestException('Selecione um responsável Comercial ativo.');
      if (!request.cadastroId) throw new BadRequestException('O cadastro vinculado ao lead não foi localizado.');
      await tx.client.update({ where: { id: request.cadastroId }, data: { internalOwnerId: owner.id } });
      const opportunity = await tx.opportunity.create({ data: {
        clientId: request.cadastroId,
        title: `Cotação do site - ${request.empresa?.trim() || request.nome}${request.solucao ? ` - ${request.solucao}` : ''}`,
        stage: 'NOVO', status: 'OPEN',
      } });
      await tx.lead.update({ where: { id: request.lead!.id }, data: {
        updatedById: user.sub,
        metadata: { ...objeto(request.lead!.metadata), triagemSite: {
          etapa: 'OPORTUNIDADE', oportunidadeId: opportunity.id, responsavelId: owner.id,
          decididoPorId: user.sub, decididoEm: new Date().toISOString(),
        } },
      } });
      const updated = await tx.solicitacaoSite.update({ where: { id }, data: { status: 'EM_ATENDIMENTO', departamento: 'COMERCIAL', responsavelId: owner.id } });
      await tx.leadTimelineEvent.create({ data: {
        leadId: request.lead!.id, type: 'UPDATED', title: 'Marketing encaminhou a cotação ao Comercial',
        description: `Oportunidade criada para ${owner.name}.`, createdById: user.sub,
        metadata: { solicitacaoSiteId: id, oportunidadeId: opportunity.id, responsavelId: owner.id },
      } });
      await tx.timelineEvent.create({ data: {
        clientId: request.cadastroId, type: 'OPPORTUNITY_CREATED', title: 'Oportunidade criada a partir de cotação do site',
        description: `Cotação qualificada pelo Marketing e encaminhada para ${owner.name}.`, createdById: user.sub,
        metadata: { solicitacaoSiteId: id, leadId: request.lead!.id, opportunityId: opportunity.id, stage: 'NOVO' },
      } });
      await tx.auditLog.create({ data: {
        category: 'CLIENT', action: 'OPPORTUNITY_CREATED', userId: user.sub, targetType: 'Opportunity', targetId: opportunity.id,
        message: 'Cotação do site aprovada pelo Marketing e enviada ao Comercial.',
        details: { solicitacaoSiteId: id, leadId: request.lead!.id, clientId: request.cadastroId, responsavelId: owner.id },
      } });
      await this.notifications.notifyUsers([owner.id], {
        title: 'Nova oportunidade do site', message: `${request.empresa?.trim() || request.nome}: cotação qualificada pelo Marketing.`,
        link: `/oportunidades/cadastro/${request.cadastroId}`, actorId: user.sub,
        metadata: { solicitacaoSiteId: id, leadId: request.lead!.id, opportunityId: opportunity.id },
      }, tx);
      return { sucesso: true, solicitacao: await this.enriquecer(updated, tx) };
    }, { timeout: 15000 });
  }

  async reprovar(user: AuthUser, id: string, dto: ReprovarCotacaoSiteDto) {
    this.autorizar(user);
    const motivo = dto.motivo?.trim();
    if (!motivo) throw new BadRequestException('Informe o motivo da reprovação.');
    return this.prisma.$transaction(async (tx) => {
      const request = await this.carregar(tx, id);
      if (request.oportunidadeId) throw new BadRequestException('Esta cotação já foi encaminhada ao Comercial.');
      if (request.status === 'REPROVADO') return { sucesso: true, solicitacao: request };
      await tx.lead.update({ where: { id: request.lead!.id }, data: {
        status: 'perdido', updatedById: user.sub,
        metadata: { ...objeto(request.lead!.metadata), triagemSite: {
          etapa: 'REPROVADO', motivoReprovacao: motivo, decididoPorId: user.sub, decididoEm: new Date().toISOString(),
        } },
      } });
      const updated = await tx.solicitacaoSite.update({ where: { id }, data: { status: 'REPROVADO', departamento: 'MARKETING' } });
      await tx.leadTimelineEvent.create({ data: {
        leadId: request.lead!.id, type: 'UPDATED', title: 'Cotação reprovada pelo Marketing', description: motivo,
        createdById: user.sub, metadata: { solicitacaoSiteId: id, motivo },
      } });
      await tx.auditLog.create({ data: {
        category: 'CLIENT', action: 'CUSTOM', userId: user.sub, targetType: 'SolicitacaoSite', targetId: id,
        message: 'Cotação do site reprovada pelo Marketing.', details: { leadId: request.lead!.id, motivo },
      } });
      return { sucesso: true, solicitacao: await this.enriquecer(updated, tx) };
    });
  }
}
