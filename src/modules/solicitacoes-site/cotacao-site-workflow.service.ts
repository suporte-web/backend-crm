import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TimelineEventType, UserRole } from '@prisma/client';
import { hasAnyRole } from '../../common/user-roles';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { NotificationsService } from '../notifications/notifications.service';
import { AtualizarCotacaoSiteDto, ConverterCotacaoSiteClienteDto, DirecionarCotacaoSiteDto } from './dto/cotacao-site-actions.dto';
import { assertCommercialWorkflowAccess, assertSiteRequestAccess, SITE_COMMERCIAL_ROLES, SITE_TRIAGE_ROLES, siteWorkflowInclude } from './site-workflow-access';

type WorkflowRequest = Prisma.SolicitacaoSiteGetPayload<{ include: typeof siteWorkflowInclude }>;

// Documento é a identidade empresarial; e-mail/telefone isolados não unem empresas.
export function documentVariants(value: string) {
  const digits = value.replace(/\D/g, '');
  const masked = digits.length === 14
    ? digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return [...new Set([digits, masked, value.trim()])];
}

@Injectable()
export class CotacaoSiteWorkflowService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  private async transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error: unknown) {
        const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
        if (attempt >= 2 || !['P2034', 'P2002'].includes(String(code))) throw error;
      }
    }
  }

  private async load(tx: Prisma.TransactionClient, user: AuthUser, id: string) {
    let request = await tx.solicitacaoSite.findUnique({ where: { id }, include: siteWorkflowInclude });
    if (!request) throw new NotFoundException('Solicitação não encontrada.');
    const etapa = request.etapaCotacao ?? (request.clientId ? 'CLIENTE' : request.prospectId ? 'PROSPECT' : 'LEAD');
    assertSiteRequestAccess(user, { ...request, etapaCotacao: etapa });
    if (request.tipo === 'COTACAO' && (!request.leadId || !request.etapaCotacao)) {
      const lead = request.lead ?? await tx.lead.findFirst({
        where: { source: 'site', metadata: { path: ['solicitacaoSiteId'], equals: id } },
        orderBy: { createdAt: 'asc' },
      });
      if (lead) request = await tx.solicitacaoSite.update({
        where: { id }, data: { leadId: lead.id, etapaCotacao: etapa }, include: siteWorkflowInclude,
      });
    }
    if (request.tipo !== 'COTACAO' || !request.leadId || !request.lead) {
      throw new BadRequestException('Esta solicitação não possui uma cotação vinculada.');
    }
    return request;
  }

  private async history(tx: Prisma.TransactionClient, user: AuthUser, request: WorkflowRequest,
    title: string, metadata: Prisma.InputJsonObject) {
    await tx.leadTimelineEvent.create({ data: {
      leadId: request.leadId!, type: 'UPDATED', title, description: title,
      createdById: user.sub,
      metadata: { solicitacaoSiteId: request.id, etapaCotacao: request.etapaCotacao, responsavelId: request.responsavelId, ...metadata },
    } });
    await tx.lead.update({ where: { id: request.leadId! }, data: { updatedById: user.sub, lastInteractionAt: new Date() } });
  }

  async listarResponsaveis(user: AuthUser) {
    if (!hasAnyRole(user, SITE_TRIAGE_ROLES)) throw new ForbiddenException('Somente a triagem pode direcionar cotações.');
    return this.prisma.user.findMany({ where: {
      isActive: true, OR: [{ role: UserRole.COMERCIAL }, { roles: { has: UserRole.COMERCIAL } }],
    }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  }

  async direcionar(user: AuthUser, id: string, dto: DirecionarCotacaoSiteDto) {
    return this.transaction(tx => this.direcionarNaTransacao(tx, user, id, dto));
  }

  async direcionarNaTransacao(tx: Prisma.TransactionClient, user: AuthUser, id: string, dto: DirecionarCotacaoSiteDto, notificar = true) {
    if (!hasAnyRole(user, SITE_TRIAGE_ROLES)) throw new ForbiddenException('Somente Marketing, Gestão ou Admin pode direcionar cotações.');
      const request = await this.load(tx, user, id);
      if (request.etapaCotacao === 'CLIENTE') throw new BadRequestException('Esta cotação já foi convertida em Cliente.');
      const owner = await tx.user.findUnique({ where: { id: dto.responsavelId } });
      if (!owner?.isActive || !hasAnyRole(owner, ['COMERCIAL'])) throw new BadRequestException('Selecione um usuário Comercial ativo.');
      if (request.etapaCotacao === 'PROSPECT' && request.responsavelId === owner.id) {
        return { sucesso: true, solicitacao: request };
      }
      const document = request.cnpj?.replace(/\D/g, '') || null;
      const existing = request.prospect ?? (document ? await tx.prospect.findFirst({
        where: { document: { in: documentVariants(request.cnpj!) } }, orderBy: { createdAt: 'asc' },
      }) : null);
      const prospect = existing ?? await tx.prospect.create({ data: {
        nomeRazaoSocial: request.empresa?.trim() || request.nome,
        nomeContato: request.nome, email: request.email, telefone: request.telefone,
        document, cidade: request.cidade, sourceLeadId: request.leadId, prospectedById: request.lead?.prospectedById, prospectedByName: request.lead?.prospectedByName, origem: 'SITE', statusCadastral: 'PROSPECT', portalAccessStatus: 'SEM_ACESSO',
      } });
      await tx.lead.update({ where: { id: request.leadId! }, data: { convertedProspectId: prospect.id } });
      await this.history(tx, user, request, request.etapaCotacao === 'PROSPECT' ? 'Responsável Comercial alterado' : 'Lead direcionado ao Comercial como Prospect', {
        de: request.etapaCotacao, para: 'PROSPECT', prospectId: prospect.id,
        responsavelAnteriorId: request.responsavelId, responsavelId: owner.id,
        responsavelNome: owner.name, reusedExistingProspect: Boolean(existing),
      });
      const updated = await tx.solicitacaoSite.update({ where: { id }, data: {
        prospectId: prospect.id, responsavelId: owner.id, etapaCotacao: 'PROSPECT', status: 'EM_ATENDIMENTO', departamento: 'COMERCIAL',
      }, include: siteWorkflowInclude });
      if (notificar) await this.notifications.notifyUsers([owner.id], {
        title: 'Novo Prospect atribuído', message: `${request.empresa?.trim() || request.nome}: cotação direcionada para seu acompanhamento.`,
        link: `/solicitacoes-site/${id}`, actorId: user.sub, metadata: { solicitacaoSiteId: id, leadId: request.leadId, prospectId: prospect.id },
      }, tx, { email: false });
      return { sucesso: true, solicitacao: updated };
  }

  async atualizar(user: AuthUser, id: string, dto: AtualizarCotacaoSiteDto) {
    return this.transaction(async (tx) => {
      const request = await this.load(tx, user, id);
      if (request.etapaCotacao !== 'LEAD') assertCommercialWorkflowAccess(user, request);
      const roles = request.etapaCotacao === 'LEAD' ? SITE_TRIAGE_ROLES : SITE_COMMERCIAL_ROLES;
      if (!hasAnyRole(user, roles)) throw new ForbiddenException('Você não tem permissão para atualizar esta etapa.');
      if (request.etapaCotacao === 'CLIENTE') throw new BadRequestException('Atualize o cadastro na tela de Clientes.');
      const data: Prisma.SolicitacaoSiteUpdateInput = {};
      const changes: Record<string, Prisma.InputJsonValue> = {};
      const fields = ['nome', 'empresa', 'email', 'telefone', 'cnpj', 'cidade', 'solucao', 'observacaoInterna'] as const;
      for (const field of fields) {
        if (dto[field] === undefined) continue;
        const raw = dto[field];
        const value = typeof raw === 'string' ? raw.trim() : '';
        if (['nome', 'email'].includes(field) && !value) throw new BadRequestException('Nome e e-mail são obrigatórios.');
        if (field === 'cnpj' && value && ![11, 14].includes(value.replace(/\D/g, '').length)) {
          throw new BadRequestException('Informe CPF/CNPJ com 11 ou 14 dígitos.');
        }
        const next = value || null;
        if (request[field] !== next) {
          changes[field] = { de: request[field], para: next };
          if (field === 'nome' || field === 'email') data[field] = value;
          else data[field] = next;
        }
      }
      if (!Object.keys(changes).length) return { sucesso: true, solicitacao: request };
      const updated = await tx.solicitacaoSite.update({ where: { id }, data, include: siteWorkflowInclude });
      // Atualiza o Prospect exclusivo; cadastro compartilhado conserva os dados de outras solicitações.
      if (request.prospectId && await tx.solicitacaoSite.count({ where: { prospectId: request.prospectId } }) === 1) {
        const prospectData: Prisma.ProspectUpdateInput = {};
        if (changes.nome) {
          prospectData.nomeContato = updated.nome;
          if (!updated.empresa?.trim()) prospectData.nomeRazaoSocial = updated.nome;
        }
        if (changes.empresa) prospectData.nomeRazaoSocial = updated.empresa?.trim() || updated.nome;
        if (changes.email) prospectData.email = updated.email;
        if (changes.telefone) prospectData.telefone = updated.telefone;
        if (changes.cidade) prospectData.cidade = updated.cidade;
        if (changes.cnpj) prospectData.document = updated.cnpj?.replace(/\D/g, '') || null;
        if (Object.keys(prospectData).length) await tx.prospect.update({ where: { id: request.prospectId }, data: prospectData });
      }

      await tx.lead.update({ where: { id: request.leadId! }, data: {
        name: updated.nome, company: updated.empresa, email: updated.email, phone: updated.telefone,
        normalizedEmail: updated.email.trim().toLowerCase(), normalizedPhone: updated.telefone?.replace(/\D/g, '') || null,
      } });
      await this.history(tx, user, request, 'Dados de qualificação atualizados', { alteracoes: changes });
      const result = await tx.solicitacaoSite.findUnique({ where: { id }, include: siteWorkflowInclude });
      return { sucesso: true, solicitacao: result! };
    });
  }

  async converterCliente(user: AuthUser, id: string, dto: ConverterCotacaoSiteClienteDto) {
    if (!hasAnyRole(user, SITE_COMMERCIAL_ROLES)) throw new ForbiddenException('Somente Comercial, Gestão ou Admin pode converter em Cliente.');
    return this.transaction(async (tx) => {
      const request = await this.load(tx, user, id);
      assertCommercialWorkflowAccess(user, request);
      if (request.etapaCotacao === 'CLIENTE' && request.clientId) return { sucesso: true, solicitacao: request };
      if (request.etapaCotacao !== 'PROSPECT' || !request.prospectId || !request.responsavelId) {
        throw new BadRequestException('Direcione a cotação para um Comercial antes de converter.');
      }
      const document = dto.document.replace(/\D/g, '');
      if (![11, 14].includes(document.length)) throw new BadRequestException('Informe CPF/CNPJ com 11 ou 14 dígitos.');
      let existing = await tx.client.findFirst({ where: { document: { in: documentVariants(dto.document) } } });
      if (!existing && request.lead?.cadastroId) {
        const cadastro = await tx.client.findUnique({ where: { id: request.lead.cadastroId } });
        if (cadastro?.modalidadeCadastro === 'LEAD') {
          if (cadastro.document && !documentVariants(dto.document).includes(cadastro.document)) {
            throw new BadRequestException('O documento informado diverge do cadastro vinculado ao Lead. Revise a qualificação.');
          }
          existing = cadastro;
        }
      }
      const ownCadastro = existing?.modalidadeCadastro === 'LEAD' && existing.id === request.lead?.cadastroId;
      const provenance = {
        sourceLeadId: request.leadId, sourceProspectId: request.prospectId,
        prospectedById: request.lead?.prospectedById ?? undefined,
        prospectedByName: request.lead?.prospectedByName ?? undefined,
      };
      const client = existing
        ? existing.modalidadeCadastro === 'LEAD'
          ? await tx.client.update({ where: { id: existing.id }, data: {
              modalidadeCadastro: 'CLIENTE', document,
              ...(ownCadastro ? {
                companyName: request.empresa?.trim() || request.nome,
                legalName: request.empresa?.trim() || request.nome,
                phone: request.telefone, city: request.cidade,
                notes: request.observacaoInterna ?? existing.notes,
              } : {}),
              sourceLeadId: existing.sourceLeadId ?? provenance.sourceLeadId,
              sourceProspectId: existing.sourceProspectId ?? provenance.sourceProspectId,
              prospectedById: existing.prospectedById ?? provenance.prospectedById,
              prospectedByName: existing.prospectedByName ?? provenance.prospectedByName,
              internalOwnerId: existing.internalOwnerId ?? request.responsavelId,
            } })
          : existing
        : await tx.client.create({ data: {
        modalidadeCadastro: 'CLIENTE', ...provenance,
        document, companyName: request.empresa?.trim() || request.nome, legalName: request.empresa?.trim() || request.nome,
        phone: request.telefone, city: request.cidade, internalOwnerId: request.responsavelId, status: 'PENDENTE',
        notes: request.observacaoInterna,
        contacts: { create: { name: request.nome, email: request.email, phone: request.telefone, role: request.cargo, isPrimary: true } },
      } });
      if (ownCadastro) {
        const contact = await tx.clientContact.findFirst({ where: { clientId: client.id, isPrimary: true }, orderBy: { createdAt: 'asc' } });
        const data = { name: request.nome, email: request.email, phone: request.telefone, role: request.cargo ?? contact?.role ?? null };
        if (contact) await tx.clientContact.update({ where: { id: contact.id }, data });
        else await tx.clientContact.create({ data: { clientId: client.id, isPrimary: true, ...data } });
      }
      await tx.timelineEvent.create({ data: {
        clientId: client.id, type: TimelineEventType.LEAD_CREATED, title: existing ? 'Cotação do site vinculada ao Cliente' : 'Cliente convertido de Prospect do site',
        description: 'Qualificação de solicitação do site concluída pelo Comercial.', createdById: user.sub,
        metadata: { solicitacaoSiteId: id, leadId: request.leadId, prospectId: request.prospectId, responsavelId: request.responsavelId, reusedExistingClient: Boolean(existing) },
      } });
      await this.history(tx, user, request, 'Prospect convertido em Cliente', {
        de: 'PROSPECT', para: 'CLIENTE', clientId: client.id, prospectId: request.prospectId, reusedExistingClient: Boolean(existing),
      });
      await tx.lead.update({ where: { id: request.leadId! }, data: { convertidoParaCliente: true } });
      const updated = await tx.solicitacaoSite.update({ where: { id }, data: {
        clientId: client.id, etapaCotacao: 'CLIENTE', status: 'CONCLUIDO',
      }, include: siteWorkflowInclude });
      return { sucesso: true, solicitacao: updated };
    });
  }
}
