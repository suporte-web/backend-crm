import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProspectStatusCadastral } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  filtroProspeccao,
  FiltrosProspeccaoDto,
} from '../../common/prospeccao';
import type { AuthUser } from '../auth/types/auth-user.type';
import { hasAnyRole } from '../../common/user-roles';

export type TipoProspeccao = 'LEAD' | 'PROSPECT' | 'CLIENTE';
type Filters = FiltrosProspeccaoDto & {
  tipo?: TipoProspeccao;
  status?: string;
  pagina?: number;
  tamanho?: number;
};
const author = { select: { id: true, name: true } } as const;
const timeline = {
  include: { createdBy: author },
  orderBy: { createdAt: 'desc' as const },
};
const leadHistoryInclude = {
  timeline,
  observations: {
    include: { createdBy: author },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.LeadInclude;
type LeadHistory = Prisma.LeadGetPayload<{
  include: typeof leadHistoryInclude;
}>;
type EventoHistorico = {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: Date;
  createdBy: { id: string; name: string } | null;
};
type EtapaHistorico = { tipo: TipoProspeccao; id: string; data: Date };

function origemProspect(provenance: {
  prospectedByName: { not: null };
  prospectedById?: string;
}): Prisma.ProspectWhereInput {
  return {
    OR: [
      provenance,
      { convertedLeads: { some: provenance } },
      { sourceLead: provenance },
    ],
  };
}
function origemCliente(provenance: {
  prospectedByName: { not: null };
  prospectedById?: string;
}): Prisma.ClientWhereInput {
  return {
    OR: [
      provenance,
      { sourceLead: provenance },
      { sourceProspect: origemProspect(provenance) },
    ],
  };
}

function statusProspect(value: string): value is ProspectStatusCadastral {
  return Object.values(ProspectStatusCadastral).some(
    (status) => status === value,
  );
}

@Injectable()
export class GestaoProspeccoesService {
  constructor(private readonly prisma: PrismaService) {}

  private autorizar(user: AuthUser) {
    if (!hasAnyRole(user, ['ADMIN', 'GESTAO', 'COMERCIAL']))
      throw new ForbiddenException(
        'Gestão de Prospecções está disponível para Admin, Gestão e Comercial.',
      );
  }

  async listar(user: AuthUser, filters: Filters) {
    this.autorizar(user);
    const pagina = Math.max(1, filters.pagina ?? 1);
    const tamanho = Math.min(100, Math.max(1, filters.tamanho ?? 20));
    const common = {
      ...filtroProspeccao(filters),
      prospectedByName: { not: null },
    };
    const leadWhere: Prisma.LeadWhereInput = {
      ...common,
      AND: [{ status: { notIn: ['converted', 'converted_to_prospect'] } }],
      convertidoParaCliente: false,
      convertedProspect: null,
      convertedClients: { none: { modalidadeCadastro: 'CLIENTE' } },
      ...(filters.status ? { status: filters.status } : {}),
    };
    // Um prospect pode ser reutilizado por leads de consultoras diferentes.
    // O filtro considera a autoria original e os leads vinculados, sem alterá-las.
    const provenance = {
      ...(filters.consultoraId ? { prospectedById: filters.consultoraId } : {}),
      prospectedByName: { not: null },
    };
    const prospectWhere: Prisma.ProspectWhereInput = {
      ...(common.createdAt ? { createdAt: common.createdAt } : {}),
      ...origemProspect(provenance),
      convertedClients: { none: { modalidadeCadastro: 'CLIENTE' } },
      ...(filters.status && statusProspect(filters.status)
        ? { statusCadastral: filters.status }
        : {}),
    };
    const clientWhere: Prisma.ClientWhereInput = {
      modalidadeCadastro: 'CLIENTE',
      ...origemCliente(provenance),
      ...(common.createdAt ? { createdAt: common.createdAt } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };
    const leadEnabled = !filters.tipo || filters.tipo === 'LEAD';
    const prospectEnabled =
      (!filters.tipo || filters.tipo === 'PROSPECT') &&
      (!filters.status || statusProspect(filters.status));
    const clientEnabled = !filters.tipo || filters.tipo === 'CLIENTE';
    const [leads, prospects, clients, leadCount, prospectCount, clientCount] =
      await Promise.all([
        leadEnabled
          ? this.prisma.lead.findMany({
              where: leadWhere,
              select: {
                id: true,
                name: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                prospectedById: true,
                prospectedByName: true,
              },
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              take: pagina * tamanho,
            })
          : [],
        prospectEnabled
          ? this.prisma.prospect.findMany({
              where: prospectWhere,
              select: {
                id: true,
                nomeRazaoSocial: true,
                statusCadastral: true,
                sourceLeadId: true,
                convertedLeads: {
                  where: provenance,
                  select: {
                    id: true,
                    prospectedById: true,
                    prospectedByName: true,
                  },
                  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
                  take: 1,
                },
                sourceLead: {
                  select: {
                    id: true,
                    prospectedById: true,
                    prospectedByName: true,
                  },
                },
                createdAt: true,
                updatedAt: true,
                prospectedById: true,
                prospectedByName: true,
              },
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              take: pagina * tamanho,
            })
          : [],
        clientEnabled
          ? this.prisma.client.findMany({
              where: clientWhere,
              select: {
                id: true,
                companyName: true,
                tradeName: true,
                legalName: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                prospectedById: true,
                prospectedByName: true,
                sourceLead: {
                  select: { prospectedById: true, prospectedByName: true },
                },
                sourceProspect: {
                  select: {
                    prospectedById: true,
                    prospectedByName: true,
                    sourceLead: {
                      select: { prospectedById: true, prospectedByName: true },
                    },
                    convertedLeads: {
                      where: provenance,
                      select: { prospectedById: true, prospectedByName: true },
                      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
                      take: 1,
                    },
                  },
                },
              },
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              take: pagina * tamanho,
            })
          : [],
        leadEnabled ? this.prisma.lead.count({ where: leadWhere }) : 0,
        prospectEnabled
          ? this.prisma.prospect.count({ where: prospectWhere })
          : 0,
        clientEnabled ? this.prisma.client.count({ where: clientWhere }) : 0,
      ]);
    const records = [
      ...leads.map((item) => ({
        ...item,
        tipo: 'LEAD' as const,
        nome: item.name,
        href: `/leads/${item.id}`,
      })),
      ...prospects.map(({ convertedLeads, sourceLead, ...item }) => {
        const ownOriginMatches =
          item.prospectedByName &&
          (!filters.consultoraId ||
            item.prospectedById === filters.consultoraId);
        const origin = ownOriginMatches
          ? item
          : (convertedLeads[0] ?? sourceLead);
        return {
          ...item,
          prospectedById: origin?.prospectedById ?? null,
          prospectedByName: origin?.prospectedByName ?? null,
          tipo: 'PROSPECT' as const,
          nome: item.nomeRazaoSocial,
          status: item.statusCadastral,
          href:
            item.sourceLeadId || convertedLeads[0]?.id
              ? `/leads/${item.sourceLeadId ?? convertedLeads[0]?.id}`
              : null,
        };
      }),
      ...clients.map(({ sourceLead, sourceProspect, ...item }) => {
        const origin = [
          item,
          sourceLead,
          sourceProspect,
          sourceProspect?.sourceLead,
          ...(sourceProspect?.convertedLeads ?? []),
        ].find(
          (candidate) =>
            candidate?.prospectedByName &&
            (!filters.consultoraId ||
              candidate.prospectedById === filters.consultoraId),
        );
        return {
          ...item,
          prospectedById: origin?.prospectedById ?? null,
          prospectedByName: origin?.prospectedByName ?? null,
          tipo: 'CLIENTE' as const,
          nome:
            item.tradeName || item.companyName || item.legalName || 'Cliente',
          href: `/clientes/${item.id}`,
        };
      }),
    ].sort(
      (a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime() ||
        a.id.localeCompare(b.id) ||
        a.tipo.localeCompare(b.tipo),
    );
    return {
      registros: records.slice((pagina - 1) * tamanho, pagina * tamanho),
      total: leadCount + prospectCount + clientCount,
      pagina,
      tamanho,
      indicadores: {
        leads: leadCount,
        prospects: prospectCount,
        clientes: clientCount,
      },
    };
  }

  async opcoes(user: AuthUser) {
    this.autorizar(user);
    const where = { prospectedByName: { not: null } };
    const [leads, prospects, clients] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        distinct: ['prospectedById', 'status'],
        select: { prospectedById: true, prospectedByName: true, status: true },
      }),
      this.prisma.prospect.findMany({
        where: origemProspect(where),
        distinct: ['prospectedById', 'statusCadastral'],
        select: {
          prospectedById: true,
          prospectedByName: true,
          statusCadastral: true,
        },
      }),
      this.prisma.client.findMany({
        where: { ...origemCliente(where), modalidadeCadastro: 'CLIENTE' },
        distinct: ['prospectedById', 'status'],
        select: { prospectedById: true, prospectedByName: true, status: true },
      }),
    ]);
    const rows = [
      ...leads,
      ...clients,
      ...prospects.map((p) => ({ ...p, status: p.statusCadastral })),
    ];
    return {
      consultoras: Array.from(
        new Map(
          rows
            .filter((r) => r.prospectedById)
            .map((r) => [
              r.prospectedById!,
              { id: r.prospectedById!, nome: r.prospectedByName! },
            ]),
        ).values(),
      ).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      status: Array.from(
        new Set(
          rows.map((r) => r.status).filter((s): s is string => Boolean(s)),
        ),
      ).sort(),
    };
  }

  async historico(user: AuthUser, tipo: TipoProspeccao, id: string) {
    this.autorizar(user);
    const where = { id, prospectedByName: { not: null } };
    if (tipo === 'LEAD') {
      const record = await this.prisma.lead.findUnique({
        where,
        include: {
          ...leadHistoryInclude,
          convertedProspect: { include: { convertedClients: { where: { modalidadeCadastro: 'CLIENTE' } } } },
          originatedProspects: { include: { convertedClients: { where: { modalidadeCadastro: 'CLIENTE' } } } },
          convertedClients: { where: { modalidadeCadastro: 'CLIENTE' } },
        },
      });
      if (!record) throw new NotFoundException('Prospecção não encontrada.');
      const prospects = [
        ...(record.convertedProspect ? [record.convertedProspect] : []),
        ...record.originatedProspects,
      ];
      return {
        consultora: record.prospectedByName,
        observacoes: record.notes,
        eventos: this.eventos([record]),
        evolucao: this.etapas([
          { tipo: 'LEAD', id: record.id, data: record.createdAt },
          ...prospects.map(
            (prospect): EtapaHistorico => ({
              tipo: 'PROSPECT',
              id: prospect.id,
              data: prospect.createdAt,
            }),
          ),
          ...[
            ...record.convertedClients,
            ...prospects.flatMap((prospect) => prospect.convertedClients),
          ].map(
            (client): EtapaHistorico => ({
              tipo: 'CLIENTE',
              id: client.id,
              data: client.createdAt,
            }),
          ),
        ]),
      };
    }
    if (tipo === 'PROSPECT') {
      const record = await this.prisma.prospect.findUnique({
        where: {
          id,
          OR: [
            { prospectedByName: { not: null } },
            { sourceLead: { prospectedByName: { not: null } } },
            { convertedLeads: { some: { prospectedByName: { not: null } } } },
          ],
        },
        include: {
          sourceLead: { include: leadHistoryInclude },
          convertedLeads: { include: leadHistoryInclude },
          convertedClients: { where: { modalidadeCadastro: 'CLIENTE' } },
        },
      });
      if (!record) throw new NotFoundException('Prospecção não encontrada.');
      const leads = [
        ...(record.sourceLead ? [record.sourceLead] : []),
        ...record.convertedLeads,
      ];
      return {
        consultora:
          record.prospectedByName ??
          leads.find((lead) => lead.prospectedByName)?.prospectedByName ??
          null,
        observacoes: record.sourceLead?.notes ?? null,
        eventos: this.eventos(leads),
        evolucao: this.etapas([
          ...leads.map(
            (lead): EtapaHistorico => ({
              tipo: 'LEAD',
              id: lead.id,
              data: lead.createdAt,
            }),
          ),
          { tipo, id: record.id, data: record.createdAt },
          ...record.convertedClients.map(
            (client): EtapaHistorico => ({
              tipo: 'CLIENTE',
              id: client.id,
              data: client.createdAt,
            }),
          ),
        ]),
      };
    }
    const record = await this.prisma.client.findUnique({
      where: { id, AND: origemCliente({ prospectedByName: { not: null } }) },
      include: {
        sourceLead: { include: leadHistoryInclude },
        sourceProspect: {
          include: {
            sourceLead: { include: leadHistoryInclude },
            convertedLeads: { include: leadHistoryInclude },
          },
        },
        timelineEvents: {
          include: { createdBy: author },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!record) throw new NotFoundException('Prospecção não encontrada.');
    const leads = [
      ...(record.sourceLead ? [record.sourceLead] : []),
      ...(record.sourceProspect?.sourceLead
        ? [record.sourceProspect.sourceLead]
        : []),
      ...(record.sourceProspect?.convertedLeads ?? []),
    ];
    return {
      consultora:
        record.prospectedByName ??
        leads.find((lead) => lead.prospectedByName)?.prospectedByName ??
        record.sourceProspect?.prospectedByName ??
        null,
      observacoes:
        record.notes ??
        record.sourceLead?.notes ??
        record.sourceProspect?.sourceLead?.notes ??
        null,
      eventos: this.eventos(leads, record.timelineEvents),
      evolucao: this.etapas([
        ...leads.map(
          (lead): EtapaHistorico => ({
            tipo: 'LEAD',
            id: lead.id,
            data: lead.createdAt,
          }),
        ),
        ...(record.sourceProspect
          ? [
              {
                tipo: 'PROSPECT',
                id: record.sourceProspect.id,
                data: record.sourceProspect.createdAt,
              } satisfies EtapaHistorico,
            ]
          : []),
        { tipo, id: record.id, data: record.createdAt },
      ]),
    };
  }

  private eventos(leads: LeadHistory[], extras: EventoHistorico[] = []) {
    const events: EventoHistorico[] = [...extras];
    for (const lead of leads) {
      events.push(...lead.timeline);
      events.push(
        ...lead.observations.map((observation) => ({
          id: observation.id,
          type: 'OBSERVACAO',
          title: 'Observação do lead',
          description: observation.content,
          createdAt: observation.createdAt,
          createdBy: observation.createdBy,
        })),
      );
    }
    return Array.from(
      new Map(events.map((event) => [event.id, event])).values(),
    ).sort(
      (a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    );
  }

  private etapas(stages: EtapaHistorico[]) {
    return Array.from(
      new Map(
        stages.map((stage) => [`${stage.tipo}:${stage.id}`, stage]),
      ).values(),
    );
  }
}
