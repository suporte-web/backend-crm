import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hasAnyRole } from '../../common/user-roles';
type AccessUser = { sub: string; role?: string; roles?: string[] };

export const SITE_TRIAGE_ROLES = ['ADMIN', 'GESTAO', 'MARKETING'] as const;
export const SITE_COMMERCIAL_ROLES = ['ADMIN', 'GESTAO', 'COMERCIAL'] as const;

export function siteRequestScope(user: AccessUser): Prisma.SolicitacaoSiteWhereInput {
  if (hasAnyRole(user, ['CONSULTORA'])) throw new ForbiddenException('Consultora não possui acesso à Fila do Site.');
  if (hasAnyRole(user, SITE_TRIAGE_ROLES)) return {};
  if (hasAnyRole(user, ['COMERCIAL'])) {
    return { tipo: 'COTACAO', responsavelId: user.sub, OR: [
      { etapaCotacao: { in: ['PROSPECT', 'CLIENTE'] } },
      { etapaCotacao: null },
    ] };
  }
  throw new ForbiddenException('Você não tem permissão para acessar solicitações do site.');
}

export function assertSiteRequestAccess(user: AccessUser, request: {
  tipo: string; responsavelId: string | null; etapaCotacao: string | null;
}) {
  siteRequestScope(user);
  if (hasAnyRole(user, ['CONSULTORA'])) throw new ForbiddenException('Consultora não possui acesso à Fila do Site.');
  if (hasAnyRole(user, SITE_TRIAGE_ROLES)) return;
  if (request.tipo !== 'COTACAO' || request.responsavelId !== user.sub ||
      !['PROSPECT', 'CLIENTE'].includes(request.etapaCotacao ?? '')) {
    throw new ForbiddenException('Esta cotação não está atribuída a você.');
  }
}

export function assertCommercialWorkflowAccess(user: AccessUser, request: { responsavelId: string | null }) {
  if (hasAnyRole(user, ['ADMIN', 'GESTAO'])) return;
  if (hasAnyRole(user, ['COMERCIAL']) && request.responsavelId === user.sub) return;
  throw new ForbiddenException('Somente o Comercial responsável pode qualificar ou converter este Prospect.');
}

export const siteWorkflowInclude = {
  anexos: { orderBy: { criadoEm: 'desc' as const } },
  responsavel: { select: { id: true, name: true } },
  prospect: true,
  client: { select: { id: true, companyName: true, document: true } },
  lead: { include: { timeline: {
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' as const },
  } } },
} satisfies Prisma.SolicitacaoSiteInclude;


// O funil convencional e a Fila do Site usam regras e transições distintas.
export function siteLeadScope(_user: AccessUser): Prisma.LeadWhereInput {
  // As solicitações do site têm fila e transições próprias, inclusive registros legados.
  return { siteRequest: null, NOT: { source: 'site' } };
}

type WorkflowLead = { id: string; source?: string; metadata?: Prisma.JsonValue | null;
  siteRequest?: { tipo: string; responsavelId: string | null; etapaCotacao: string | null } | null };
export async function assertSiteLeadAccess(prisma: Pick<Prisma.TransactionClient, 'solicitacaoSite'>, user: AccessUser,
  lead: WorkflowLead | null | undefined, write = false): Promise<void> {
  if (!lead) return;
  const metadata = lead.metadata && typeof lead.metadata === 'object' && !Array.isArray(lead.metadata) ? lead.metadata : {};
  const requestId = typeof metadata.solicitacaoSiteId === 'string' ? metadata.solicitacaoSiteId : null;
  if (!lead.siteRequest && lead.source !== 'site' && !requestId) return;
  const request = lead.siteRequest ?? await prisma.solicitacaoSite.findUnique({
    where: requestId ? { id: requestId } : { leadId: lead.id },
    select: { tipo: true, responsavelId: true, etapaCotacao: true },
  });
  if (!request || request.tipo !== 'COTACAO') return;
  if (write) throw new ForbiddenException('Qualifique esta cotação pelo workflow da Fila do Site.');
  assertSiteRequestAccess(user, request);
}
