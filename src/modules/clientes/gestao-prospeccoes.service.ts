import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../auth/types/auth-user.type';
import { getUserRoles, hasAnyRole } from '../../common/user-roles';

type Tipo = 'LEAD' | 'PROSPECT' | 'CLIENTE';
type Filtros = {
  consultoraId?: string;
  tipo?: string;
  status?: string;
  criadoDe?: string;
  criadoAte?: string;
  pagina?: number | string;
  tamanho?: number | string;
};
type Evento = {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  createdBy?: { name: string } | null;
};
type Registro = {
  id: string;
  tipo: Tipo;
  nome: string;
  status: string | null;
  createdAt: Date;
  prospectedById: string;
  prospectedByName: string | null;
  href: string;
  origemLeadId: string | null;
  observacoes: string | null;
  eventos: Evento[];
};

@Injectable()
export class GestaoProspeccoesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAccess(user: AuthUser) {
    if (
      hasAnyRole(user, ['CONSULTORA']) ||
      !hasAnyRole(user, ['ADMIN', 'GESTAO', 'COMERCIAL'])
    ) {
      throw new ForbiddenException(
        'Você não tem acesso à Gestão de Prospecções.',
      );
    }
    const roles = getUserRoles(user);
    const permissions = await this.prisma.roleScreenPermission.findMany({
      where: { role: { in: roles }, screenKey: 'prospectingManagement' },
    });
    if (
      !roles.some(
        (role) =>
          ['ADMIN', 'GESTAO', 'COMERCIAL'].includes(role) &&
          permissions.find((p) => p.role === role)?.isEnabled !== false,
      )
    ) {
      throw new ForbiddenException(
        'A Gestão de Prospecções está desabilitada para seu perfil.',
      );
    }
  }

  private metadataId(metadata: unknown, key: string): string | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
      return null;
    const value = (metadata as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : null;
  }

  private async loadRecords() {
    const consultoras = await this.prisma.user.findMany({
      where: { OR: [{ role: 'CONSULTORA' }, { roles: { has: 'CONSULTORA' } }] },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const ids = consultoras.map((c) => c.id);
    const nomes = new Map(consultoras.map((c) => [c.id, c.name]));
    const leads = await this.prisma.lead.findMany({
      where: { createdById: { in: ids } },
      include: {
        timeline: { include: { createdBy: { select: { name: true } } } },
      },
    });
    const porCliente = new Map(
      leads.flatMap((l) => {
        const id = this.metadataId(l.metadata, 'clientId');
        return id ? [[id, l] as const] : [];
      }),
    );
    const porProspect = new Map(
      leads.flatMap((l) => {
        const id = this.metadataId(l.metadata, 'prospectId');
        return id ? [[id, l] as const] : [];
      }),
    );
    const [clientes, prospects] = await Promise.all([
      this.prisma.client.findMany({
        where: {
          OR: [
            { internalOwnerId: { in: ids } },
            { id: { in: [...porCliente.keys()] } },
            {
              timelineEvents: {
                some: { type: 'LEAD_CREATED', createdById: { in: ids } },
              },
            },
          ],
        },
        include: {
          timelineEvents: {
            include: { createdBy: { select: { name: true } } },
          },
        },
      }),
      this.prisma.prospect.findMany({
        where: {
          OR: [
            { id: { in: [...porProspect.keys()] } },
            { createdFromTicket: { leadId: { in: leads.map((l) => l.id) } } },
          ],
        },
        include: { createdFromTicket: { select: { leadId: true } } },
      }),
    ]);
    const registros: Registro[] = leads
      .filter((l) => l.createdById)
      .map((l) => ({
        id: l.id,
        tipo: 'LEAD',
        nome: l.company || l.name,
        status: l.status,
        createdAt: l.createdAt,
        prospectedById: l.createdById!,
        prospectedByName: nomes.get(l.createdById!) ?? null,
        href: `/leads/${l.id}`,
        origemLeadId: l.id,
        observacoes: l.notes,
        eventos: l.timeline,
      }));
    for (const client of clientes) {
      const lead = porCliente.get(client.id);
      const creator = client.timelineEvents.find(
        (e) =>
          e.type === 'LEAD_CREATED' &&
          e.createdById &&
          nomes.has(e.createdById),
      );
      const autora =
        lead?.createdById ?? creator?.createdById ?? client.internalOwnerId;
      if (!autora || !nomes.has(autora)) continue;
      registros.push({
        id: client.id,
        tipo: 'CLIENTE',
        nome:
          client.tradeName ||
          client.legalName ||
          client.companyName ||
          'Cadastro',
        status: client.status,
        createdAt: client.createdAt,
        prospectedById: autora,
        prospectedByName: nomes.get(autora) ?? null,
        href: `/cadastros/${client.id}`,
        origemLeadId: lead?.id ?? null,
        observacoes: client.notes,
        eventos: client.timelineEvents,
      });
    }
    for (const prospect of prospects) {
      const lead =
        porProspect.get(prospect.id) ??
        leads.find((l) => l.id === prospect.createdFromTicket?.leadId);
      if (!lead?.createdById) continue;
      registros.push({
        id: prospect.id,
        tipo: 'PROSPECT',
        nome: prospect.nomeRazaoSocial,
        status: prospect.statusCadastral,
        createdAt: prospect.createdAt,
        prospectedById: lead.createdById,
        prospectedByName: nomes.get(lead.createdById) ?? null,
        href: `/prospects/${prospect.id}`,
        origemLeadId: lead.id,
        observacoes: lead.notes,
        eventos: [],
      });
    }
    return { consultoras, registros };
  }

  private date(value?: string, end = false) {
    if (!value) return null;
    const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException('Informe um período válido.');
    }
    return date;
  }

  async findAll(user: AuthUser, filtros: Filtros) {
    await this.assertAccess(user);
    const pagina = Number(filtros.pagina ?? 1),
      tamanho = Number(filtros.tamanho ?? 20);
    if (
      !Number.isInteger(pagina) ||
      pagina < 1 ||
      !Number.isInteger(tamanho) ||
      tamanho < 1 ||
      tamanho > 100
    ) {
      throw new BadRequestException('Paginação inválida.');
    }
    if (filtros.tipo && !['LEAD', 'PROSPECT', 'CLIENTE'].includes(filtros.tipo))
      throw new BadRequestException('Tipo inválido.');
    const de = this.date(filtros.criadoDe),
      ate = this.date(filtros.criadoAte, true);
    if (de && ate && de > ate)
      throw new BadRequestException('Período inválido.');
    const { registros } = await this.loadRecords();
    const filtrados = registros
      .filter(
        (r) =>
          (!filtros.consultoraId ||
            r.prospectedById === filtros.consultoraId) &&
          (!filtros.tipo || r.tipo === filtros.tipo) &&
          (!filtros.status || r.status === filtros.status) &&
          (!de || r.createdAt >= de) &&
          (!ate || r.createdAt <= ate),
      )
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() ||
          a.id.localeCompare(b.id),
      );
    return {
      registros: filtrados
        .slice((pagina - 1) * tamanho, pagina * tamanho)
        .map(({ eventos, observacoes, origemLeadId, ...registro }) => registro),
      total: filtrados.length,
      pagina,
      tamanho,
      indicadores: {
        leads: filtrados.filter((r) => r.tipo === 'LEAD').length,
        prospects: filtrados.filter((r) => r.tipo === 'PROSPECT').length,
        clientes: filtrados.filter((r) => r.tipo === 'CLIENTE').length,
      },
    };
  }

  async options(user: AuthUser) {
    await this.assertAccess(user);
    const { consultoras, registros } = await this.loadRecords();
    return {
      consultoras: consultoras.map((c) => ({ id: c.id, nome: c.name })),
      status: [
        ...new Set(registros.flatMap((r) => (r.status ? [r.status] : []))),
      ].sort(),
    };
  }

  async history(user: AuthUser, tipo: string, id: string) {
    await this.assertAccess(user);
    const { registros } = await this.loadRecords();
    const registro = registros.find((r) => r.id === id && r.tipo === tipo);
    if (!registro) throw new NotFoundException('Prospecção não encontrada.');
    const familia = registros
      .filter(
        (r) =>
          r === registro ||
          (registro.origemLeadId && r.origemLeadId === registro.origemLeadId),
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const eventos = [
      ...new Map(
        familia.flatMap((r) => r.eventos).map((e) => [e.id, e]),
      ).values(),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return {
      consultora: registro.prospectedByName,
      observacoes: registro.observacoes,
      eventos,
      evolucao: familia.map((r) => ({
        tipo: r.tipo,
        id: r.id,
        data: r.createdAt,
      })),
    };
  }
}
