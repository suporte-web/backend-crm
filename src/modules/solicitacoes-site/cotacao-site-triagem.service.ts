import { garantirCadastroLead } from '../../common/cadastros';
import { CotacaoSiteWorkflowService } from './cotacao-site-workflow.service';
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
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService, private readonly workflow: CotacaoSiteWorkflowService) {}


  private async transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await this.prisma.$transaction(work, { timeout: 15000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
      catch (error: unknown) {
        const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
        if (attempt === 2 || !['P2034', 'P2002'].includes(code)) throw error;
      }
    }
    throw new Error('Transação não concluída.');
  }

  private autorizar(user: AuthUser) {
    if (hasAnyRole(user, ['CONSULTORA']) || !hasAnyRole(user, TRIAGEM)) throw new ForbiddenException('Somente Marketing, Gestão ou Admin pode decidir a triagem do site.');
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
      where: solicitacao.leadId ? { id: solicitacao.leadId } : { source: 'site', metadata: { path: ['solicitacaoSiteId'], equals: solicitacao.id } },
      include: { timeline: { orderBy: { createdAt: 'desc' }, take: 50, include: { createdBy: { select: { id: true, name: true } } } } },
    });
    const triagem = objeto(objeto(lead?.metadata).triagemSite);
    const oportunidadeId = typeof triagem.oportunidadeId === 'string' ? triagem.oportunidadeId : null;
    return {
      ...solicitacao,
      etapaCotacao: solicitacao.status === 'REPROVADO' ? 'REPROVADO' : solicitacao.etapaCotacao ?? (solicitacao.clientId ? 'CLIENTE' : solicitacao.prospectId ? 'PROSPECT' : oportunidadeId ? 'OPORTUNIDADE' : 'LEAD'),
      leadId: solicitacao.leadId ?? lead?.id ?? null,
      cadastroId: lead?.cadastroId ?? null,
      oportunidadeId,
      motivoReprovacao: typeof triagem.motivoReprovacao === 'string' ? triagem.motivoReprovacao : null,
      lead,
      responsavel: solicitacao.responsavelId ? await tx.user.findUnique({ where: { id: solicitacao.responsavelId }, select: { id: true, name: true } }) : null,
    };
  }

  podeVisualizar(user: AuthUser, solicitacao: Awaited<ReturnType<CotacaoSiteTriagemService['enriquecer']>>) {
    if (hasAnyRole(user, ['CONSULTORA'])) return false;
    return solicitacao.tipo !== 'COTACAO' || hasAnyRole(user, TRIAGEM) ||
      (hasAnyRole(user, ['COMERCIAL']) && ['OPORTUNIDADE', 'PROSPECT', 'CLIENTE'].includes(solicitacao.etapaCotacao ?? '') && solicitacao.responsavelId === user.sub);
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
    return this.transaction(async (tx) => {
      const request = await this.carregar(tx, id);
      if (request.etapaCotacao === 'CLIENTE') throw new BadRequestException('Esta cotação já foi convertida em Cliente.');
      if (request.oportunidadeId && request.prospectId && request.responsavelId === dto.responsavelId) return { sucesso: true, solicitacao: request };
      if (request.status === 'REPROVADO') throw new BadRequestException('Uma cotação reprovada não pode ser encaminhada.');
      const owner = await tx.user.findUnique({ where: { id: dto.responsavelId } });
      if (!owner?.isActive || !hasAnyRole(owner, ['COMERCIAL'])) throw new BadRequestException('Selecione um responsável Comercial ativo.');
      const cadastroId = request.cadastroId ?? (await garantirCadastroLead(tx, request.lead!)).id;
      const qualified = await this.workflow.direcionarNaTransacao(tx, user, id, dto, false);
      await tx.client.update({ where: { id: cadastroId }, data: { internalOwnerId: owner.id } });
      const opportunity = request.oportunidadeId ? await tx.opportunity.findUnique({ where: { id: request.oportunidadeId } }) : await tx.opportunity.create({ data: {
        clientId: cadastroId,
        title: `Cotação do site - ${request.empresa?.trim() || request.nome}${request.solucao ? ` - ${request.solucao}` : ''}`,
        stage: 'NOVO', status: 'OPEN',
      } });
      if (!opportunity || opportunity.clientId !== cadastroId) throw new BadRequestException('Oportunidade incompatível com o cadastro da cotação.');
      await tx.lead.update({ where: { id: request.lead!.id }, data: {
        updatedById: user.sub,
        metadata: { ...objeto(request.lead!.metadata), triagemSite: {
          etapa: 'PROSPECT', oportunidadeId: opportunity.id, responsavelId: owner.id,
          decididoPorId: user.sub, decididoEm: new Date().toISOString(),
        } },
      } });
      const updated = qualified.solicitacao;
      await tx.leadTimelineEvent.create({ data: {
        leadId: request.lead!.id, type: 'UPDATED', title: 'Marketing encaminhou a cotação ao Comercial',
        description: `Oportunidade criada para ${owner.name}.`, createdById: user.sub,
        metadata: { solicitacaoSiteId: id, oportunidadeId: opportunity.id, responsavelId: owner.id },
      } });
      if (!request.oportunidadeId) await tx.timelineEvent.create({ data: {
        clientId: cadastroId, type: 'OPPORTUNITY_CREATED', title: 'Oportunidade criada a partir de cotação do site',
        description: `Cotação qualificada pelo Marketing e encaminhada para ${owner.name}.`, createdById: user.sub,
        metadata: { solicitacaoSiteId: id, leadId: request.lead!.id, opportunityId: opportunity.id, stage: 'NOVO' },
      } });
      if (!request.oportunidadeId) await tx.auditLog.create({ data: {
        category: 'CLIENT', action: 'OPPORTUNITY_CREATED', userId: user.sub, targetType: 'Opportunity', targetId: opportunity.id,
        message: 'Cotação do site aprovada pelo Marketing e enviada ao Comercial.',
        details: { solicitacaoSiteId: id, leadId: request.lead!.id, clientId: cadastroId, responsavelId: owner.id },
      } });
      await this.notifications.notifyUsers([owner.id], {
        title: 'Nova oportunidade do site', message: `${request.empresa?.trim() || request.nome}: cotação qualificada pelo Marketing.`,
        link: `/oportunidades/cadastro/${cadastroId}`, actorId: user.sub,
        metadata: { solicitacaoSiteId: id, leadId: request.lead!.id, opportunityId: opportunity.id },
      }, tx, { email: false });
      return { sucesso: true, solicitacao: await this.enriquecer(updated, tx) };
    });
  }

  async reprovar(user: AuthUser, id: string, dto: ReprovarCotacaoSiteDto) {
    this.autorizar(user);
    const motivo = dto.motivo?.trim();
    if (!motivo) throw new BadRequestException('Informe o motivo da reprovação.');
    return this.prisma.$transaction(async (tx) => {
      const request = await this.carregar(tx, id);
      if (request.oportunidadeId || request.prospectId || request.clientId || ['PROSPECT', 'CLIENTE'].includes(request.etapaCotacao ?? '')) throw new BadRequestException('Esta cotação já foi encaminhada ao Comercial.');
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
