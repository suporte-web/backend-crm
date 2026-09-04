import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadTimelineEventType,
  MessageSenderType,
  Prisma,
  TicketHistoryEventType,
  TicketStatus,
  TicketType,
  UserRole,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

import { CriarSolicitacaoSiteDto } from './dto/criar-solicitacao-site.dto';
import { ListarSolicitacoesSiteDto } from './dto/listar-solicitacoes-site.dto';

@Injectable()
export class SolicitacoesSiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async criar(dto: CriarSolicitacaoSiteDto) {
    const resultado = await this.prisma.$transaction(async (tx) => {
      const solicitacao = await tx.solicitacaoSite.create({
        data: {
          tipo: dto.tipo,
          departamento: dto.departamento,

          status: 'NOVO',
          origem: 'SITE_PIZZATTOLOG',

          nome: dto.nome,
          email: dto.email,
          telefone: dto.telefone,
          cargo: dto.cargo,

          empresa: dto.empresa,
          cnpj: dto.cnpj,

          solucao: dto.solucao,

          cidade: dto.cidade,
          categoriaCnh: dto.categoriaCnh,
          possuiMopp: dto.possuiMopp,
          possuiEar: dto.possuiEar,
          marcaVeiculo: dto.marcaVeiculo,
          anoVeiculo: dto.anoVeiculo,

          assunto: dto.assunto,
          mensagem: dto.mensagem,

          aceitePrivacidade:
            dto.aceitePrivacidade ?? false,

          aceiteComunicacoes:
            dto.aceiteComunicacoes ?? false,
        },
      });

      if (dto.tipo !== 'COTACAO') {
        return {
          solicitacao,
          lead: null,
        };
      }

      const lead = await this.registrarLeadDeCotacaoSite(
        tx,
        dto,
        solicitacao.id,
      );

      return {
        solicitacao,
        lead,
      };
    });

    return {
      sucesso: true,
      mensagem:
        dto.tipo === 'COTACAO'
          ? 'Cotação recebida como lead com sucesso.'
          : 'Solicitação recebida com sucesso.',
      solicitacao: resultado.solicitacao,
      lead: resultado.lead,
    };
  }

  async listar(filtros: ListarSolicitacoesSiteDto) {
    const {
      tipo,
      excluirTipo,
      status,
      departamento,
      busca,
    } = filtros;

    const solicitacoes =
      await this.prisma.solicitacaoSite.findMany({
        where: {
          ...(tipo
            ? {
                tipo,
              }
            : {}),

          ...(excluirTipo
            ? {
                NOT: {
                  tipo: excluirTipo,
                },
              }
            : {}),

          ...(status
            ? {
                status,
              }
            : {}),

          ...(departamento
            ? {
                departamento,
              }
            : {}),

          ...(busca
            ? {
                OR: [
                  {
                    nome: {
                      contains: busca,
                      mode: 'insensitive',
                    },
                  },
                  {
                    email: {
                      contains: busca,
                      mode: 'insensitive',
                    },
                  },
                  {
                    empresa: {
                      contains: busca,
                      mode: 'insensitive',
                    },
                  },
                  {
                    cnpj: {
                      contains: busca,
                      mode: 'insensitive',
                    },
                  },
                ],
              }
            : {}),
        },

        orderBy: {
          criadoEm: 'desc',
        },

        select: {
          id: true,

          tipo: true,
          departamento: true,

          status: true,
          origem: true,

          nome: true,
          email: true,
          telefone: true,

          empresa: true,
          cnpj: true,

          solucao: true,

          cidade: true,
          categoriaCnh: true,
          marcaVeiculo: true,

          assunto: true,

          criadoEm: true,
          atualizadoEm: true,
        },
      });

    return {
      sucesso: true,
      total: solicitacoes.length,
      solicitacoes,
    };
  }

  async buscarPorId(id: string) {
    const solicitacao =
      await this.prisma.solicitacaoSite.findUnique({
        where: {
          id,
        },

        include: {
          anexos: {
            orderBy: {
              criadoEm: 'desc',
            },
          },
        },
      });

    if (!solicitacao) {
      throw new NotFoundException(
        'Solicitação não encontrada.',
      );
    }

    return {
      sucesso: true,
      solicitacao,
    };
  }

  private sanitizeText(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private normalizeEmail(email?: string | null) {
    const value = email?.trim().toLowerCase();
    return value || null;
  }

  private normalizePhone(phone?: string | null) {
    const digits = phone?.replace(/\D/g, '') ?? '';
    return digits || null;
  }

  private montarObservacoesCotacao(dto: CriarSolicitacaoSiteDto) {
    return [
      dto.solucao ? `Solução: ${dto.solucao}.` : null,
      dto.assunto ? `Assunto: ${dto.assunto}.` : null,
      dto.mensagem ? `Mensagem: ${dto.mensagem}` : null,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private async registrarLeadDeCotacaoSite(
    tx: Prisma.TransactionClient,
    dto: CriarSolicitacaoSiteDto,
    solicitacaoId: string,
  ) {
    const email = this.sanitizeText(dto.email);
    const phone = this.sanitizeText(dto.telefone);
    const normalizedEmail = this.normalizeEmail(email);
    const normalizedPhone = this.normalizePhone(phone);
    const notes = this.montarObservacoesCotacao(dto);

    const existingLead = await tx.lead.findFirst({
      where: {
        OR: [
          ...(normalizedEmail
            ? [
                {
                  normalizedEmail,
                },
              ]
            : []),
          ...(normalizedPhone
            ? [
                {
                  normalizedPhone,
                },
              ]
            : []),
        ],
      },
    });

    if (existingLead) {
      const updatedLead = await tx.lead.update({
        where: {
          id: existingLead.id,
        },
        data: {
          email: existingLead.email ?? email,
          phone: existingLead.phone ?? phone,
          company: existingLead.company ?? this.sanitizeText(dto.empresa),
          notes: existingLead.notes ?? (notes || undefined),
          source: existingLead.source || 'site',
          channel: existingLead.channel ?? 'site',
          lastInteractionAt: new Date(),
          metadata: {
            origem: 'SITE_PIZZATTOLOG',
            tipoSolicitacao: dto.tipo,
            solicitacaoSiteId: solicitacaoId,
            solucao: dto.solucao ?? null,
            cnpj: dto.cnpj ?? null,
          },
          rawPayload: dto as unknown as Prisma.InputJsonValue,
          timeline: {
            create: {
              type: LeadTimelineEventType.UPDATED,
              title: 'Nova cotação recebida pelo site',
              description:
                notes ||
                'O contato enviou uma nova solicitação de cotação pelo site.',
              metadata: {
                solicitacaoSiteId: solicitacaoId,
                tipoSolicitacao: dto.tipo,
                origem: 'SITE_PIZZATTOLOG',
              },
            },
          },
        },
      });

      await this.notificationsService.notifyRoles(
        [UserRole.COMERCIAL, UserRole.ADMIN],
        {
          title: 'Nova cotação do site',
          message:
            'Solicitação de cotação recebida pelo site e vinculada a um lead existente.',
          link: `/leads/${updatedLead.id}`,
          emailSubject: 'Nova cotação recebida pelo site',
          emailSummary: `${updatedLead.name}${updatedLead.company ? ` - ${updatedLead.company}` : ''}`,
          metadata: {
            leadId: updatedLead.id,
            solicitacaoSiteId: solicitacaoId,
            origem: 'SITE_PIZZATTOLOG',
          },
        },
        tx,
      );

      return updatedLead;
    }

    const lead = await tx.lead.create({
      data: {
        name: this.sanitizeText(dto.nome) ?? 'Contato do site',
        email,
        phone,
        company: this.sanitizeText(dto.empresa),
        source: 'site',
        status: 'entrada_leads',
        notes,
        channel: 'site',
        normalizedEmail,
        normalizedPhone,
        metadata: {
          origem: 'SITE_PIZZATTOLOG',
          tipoSolicitacao: dto.tipo,
          solicitacaoSiteId: solicitacaoId,
          solucao: dto.solucao ?? null,
          cnpj: dto.cnpj ?? null,
        },
        rawPayload: dto as unknown as Prisma.InputJsonValue,
        lastInteractionAt: new Date(),
        timeline: {
          create: {
            type: LeadTimelineEventType.CREATED_MANUAL,
            title: 'Lead criado por cotação do site',
            description:
              notes ||
              'Lead criado automaticamente a partir do formulário Solicitar cotação do site.',
            metadata: {
              solicitacaoSiteId: solicitacaoId,
              tipoSolicitacao: dto.tipo,
              origem: 'SITE_PIZZATTOLOG',
            },
          },
        },
      },
    });

    const ticketDescription = [
      dto.empresa ? `Empresa: ${dto.empresa}.` : null,
      email ? `E-mail: ${email}.` : null,
      phone ? `Telefone: ${phone}.` : null,
      notes || null,
    ]
      .filter(Boolean)
      .join(' ');

    const ticket = await tx.ticket.create({
      data: {
        leadId: lead.id,
        type: TicketType.LEAD,
        status: TicketStatus.AGUARDANDO_COMERCIAL,
        requiresActionRole: UserRole.COMERCIAL,
        internalOnly: true,
        subject: `Lead do site: ${lead.name}`,
        description:
          ticketDescription ||
          'Solicitação de cotação recebida pelo site e registrada como lead.',
        messages: {
          create: {
            senderType: MessageSenderType.INTERNO,
            message:
              ticketDescription ||
              'Solicitação de cotação recebida pelo site e registrada como lead.',
            isInternal: true,
          },
        },
        history: {
          create: {
            eventType: TicketHistoryEventType.CREATED,
            title: 'Lead recebido pelo site',
            description:
              'Ticket criado automaticamente a partir do formulário Solicitar cotação.',
            internalOnly: true,
          },
        },
      },
    });

    await this.notificationsService.notifyRoles(
      [UserRole.COMERCIAL, UserRole.ADMIN],
      {
        ticketId: ticket.id,
        title: 'Nova cotação do site',
        message:
          'Solicitação de cotação recebida pelo site e registrada como lead.',
        link: `/leads/${lead.id}`,
        emailSubject: 'Nova cotação recebida pelo site',
        emailSummary: `${lead.name}${lead.company ? ` - ${lead.company}` : ''}`,
        metadata: {
          leadId: lead.id,
          solicitacaoSiteId: solicitacaoId,
          origem: 'SITE_PIZZATTOLOG',
        },
      },
      tx,
    );

    return lead;
  }
}
