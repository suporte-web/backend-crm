import { consultaValorPropostaComercial, valorPropostaComercial } from '../../common/valor-proposta-comercial';
import { MOTIVOS_PERDA, resolverPerda, historicoPerda, descricaoPerda } from './motivos-perda';
import {
  modalidadesPermitidas,
  validarAcessoCadastro,
} from '../../common/permissoes-cadastros';
import { NotificationsService } from '../notifications/notifications.service';
import { hasAnyRole } from '../../common/user-roles';
import { cadastroMcg, oportunidadesDaConsultora } from '../../common/acesso-consultora';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditLogAction,
  AuditLogCategory,
  OpportunityStage as EtapaOportunidade,
  OpportunityStatus as SituacaoOportunidade,
  Prisma,
  ModalidadeCadastro,
  StatusProposta,
  TimelineEventType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CriarOportunidadeDto } from './dto/criar-oportunidade.dto';
import { AtualizarOportunidadeDto } from './dto/atualizar-oportunidade.dto';
import { AtualizarEtapaOportunidadeDto } from './dto/atualizar-etapa-oportunidade.dto';

@Injectable()
export class OportunidadesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async validarUsuarioInterno(user: AuthUser) {
    const consultora = hasAnyRole(user, ['CONSULTORA']);
    const perfis = consultora
      ? ['CONSULTORA']
      : user.roles?.length
        ? user.roles
        : [user.role];
    const internos = perfis.filter((role) =>
      ['ADMIN', 'GESTAO', 'COMERCIAL', 'CONSULTORA'].includes(role),
    );
    if (!internos.length)
      throw new ForbiddenException(
        'Você não tem permissão para acessar Oportunidades/Propostas.',
      );
    const permissoes = await this.prisma.roleScreenPermission.findMany({
      where: {
        role: { in: internos as import('@prisma/client').UserRole[] },
        screenKey: 'opportunities',
      },
    });
    if (
      !internos.some(
        (role) =>
          permissoes.find((item) => item.role === role)?.isEnabled ??
          !consultora,
      )
    )
      throw new ForbiddenException(
        'Você não tem permissão para acessar Oportunidades/Propostas.',
      );
  }

  private async validarCadastro(
    user: AuthUser,
    cadastro: {
      id: string;
      modalidadeCadastro: ModalidadeCadastro;
      internalOwnerId: string | null;
    },
  ) {
    await this.validarUsuarioInterno(user);
    if (hasAnyRole(user, ['CONSULTORA'])) {
      const permitido = await this.prisma.client.findFirst({
        where: { id: cadastro.id, ...cadastroMcg() },
        select: { id: true },
      });
      if (!permitido)
        throw new ForbiddenException(
          'Você não tem permissão para acessar oportunidades deste cadastro.',
        );
    } else {
      await validarAcessoCadastro(
        this.prisma,
        user,
        cadastro.modalidadeCadastro,
      );
    }
  }

  async listarMotivosPerda(user: AuthUser) {
    await this.validarUsuarioInterno(user);
    return MOTIVOS_PERDA;
  }

  async listarCadastros(user: AuthUser) {
    await this.validarUsuarioInterno(user);
    const consultora = hasAnyRole(user, ['CONSULTORA']);
    const tipos = consultora
      ? [ModalidadeCadastro.CLIENTE, ModalidadeCadastro.LEAD]
      : await modalidadesPermitidas(this.prisma, user);
    return this.prisma.client.findMany({
      where: {
        modalidadeCadastro: { in: tipos },
        ...(consultora ? cadastroMcg() : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { companyName: 'asc' },
    });
  }

  async validarDetalhe(user: AuthUser, id: string) {
    await this.validarUsuarioInterno(user);
    const cadastro = await this.prisma.client.findUnique({ where: { id } });
    if (!cadastro) throw new NotFoundException('Cadastro não encontrado.');
    await this.validarCadastro(user, cadastro);
  }

  private async validarAutoriaOportunidade(user: AuthUser, id: string, clientId: string) {
    if (!hasAnyRole(user, ['CONSULTORA'])) return;
    const evento = await this.prisma.timelineEvent.findFirst({
      where: { clientId, type: 'OPPORTUNITY_CREATED', createdById: user.sub, metadata: { path: ['opportunityId'], equals: id } },
      select: { id: true },
    });
    if (!evento) throw new ForbiddenException('Você não tem permissão para acessar esta oportunidade.');
  }

  private situacaoPorEtapa(stage: EtapaOportunidade): SituacaoOportunidade {
    if (stage === EtapaOportunidade.GANHO) {
      return SituacaoOportunidade.WON;
    }

    if (stage === EtapaOportunidade.PERDIDO) {
      return SituacaoOportunidade.LOST;
    }

    return SituacaoOportunidade.OPEN;
  }

  private valorPositivo(value: Prisma.Decimal | null | undefined) {
    return value !== null && value !== undefined && value.gt(0);
  }

  private normalizarTexto(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private async obterValorNegociado(opportunity: {
    id: string;
    quoteId?: string | null;
    value?: Prisma.Decimal | null;
  }) {
    if (this.valorPositivo(opportunity.value)) {
      return opportunity.value;
    }

    const ultimaProposta = await this.prisma.proposta.findFirst({
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

    const valorUltimaProposta = ultimaProposta?.valor;

    if (this.valorPositivo(valorUltimaProposta)) {
      return valorUltimaProposta;
    }

    if (opportunity.quoteId) {
      const quote = await this.prisma.quote.findUnique({
        where: { id: opportunity.quoteId },
        select: {
          price: true,
        },
      });

      const valorCotacao = quote?.price;

      if (this.valorPositivo(valorCotacao)) {
        return valorCotacao;
      }
    }

    return null;
  }

  async criar(user: AuthUser, dto: CriarOportunidadeDto) {
    await this.validarUsuarioInterno(user);

    const client = await this.prisma.client.findUnique({
      where: { id: dto.clienteId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    await this.validarCadastro(user, client);

    if (dto.cotacaoId) {
      const quote = await this.prisma.quote.findUnique({
        where: { id: dto.cotacaoId },
        select: {
          id: true,
          clientId: true,
        },
      });

      if (!quote || quote.clientId !== dto.clienteId) {
        throw new BadRequestException('Cotação inválida para este cliente.');
      }
    }

    const stage = dto.etapa ?? EtapaOportunidade.NOVO;
    const perda = resolverPerda(this.situacaoPorEtapa(stage), dto);

    const oportunidadeCriada = await this.prisma.$transaction(async (tx) => {
      const opportunity = await tx.opportunity.create({
        data: {
          clientId: dto.clienteId,
          quoteId: dto.cotacaoId,
          title: dto.titulo,
          value:
            dto.valor !== undefined ? new Prisma.Decimal(dto.valor) : undefined,
          stage,
          status: this.situacaoPorEtapa(stage),
          ...perda,
          preContract: dto.preContrato ?? false,
          preContractNotes: dto.observacoesPreContrato,
          expectedCloseDate: dto.previsaoFechamento
            ? new Date(dto.previsaoFechamento)
            : null,
        },
      });

      await tx.timelineEvent.create({
        data: {
          clientId: dto.clienteId,
          type: TimelineEventType.OPPORTUNITY_CREATED,
          title: 'Oportunidade criada',
          description: `A oportunidade "${dto.titulo}" foi registrada para ${
            client.companyName ?? client.user?.name ?? 'Cliente sem nome'
          }.` + descricaoPerda(perda),
          createdById: user.sub,
          metadata: {
            opportunityId: opportunity.id,
            stage,
            ...historicoPerda(null, perda),
          },
        },
      });

      if (
        hasAnyRole(user, ['CONSULTORA']) &&
        (stage === EtapaOportunidade.PROPOSTA || dto.preContrato)
      ) {
        const actor = await tx.user.findUnique({
          where: { id: user.sub },
          select: { name: true },
        });
        const recipients = await this.notificationsService.getUserIdsByRoles(
          [UserRole.COMERCIAL],
          tx,
        );
        await this.notificationsService.notifyUsers(
          recipients,
          {
            title: 'Nova proposta de consultora',
            message: `${actor?.name ?? 'Consultora'} cadastrou a proposta "${dto.titulo}" para ${client.companyName ?? client.user?.name ?? 'o cadastro'}.`,
            link: `/oportunidades/cadastro/${client.id}/propostas/${opportunity.id}`,
            actorId: user.sub,
            metadata: {
              opportunityId: opportunity.id,
              clientId: client.id,
              consultoraId: user.sub,
            },
          },
          tx,
          { email: false },
        );
      }
      return opportunity;
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.CLIENT,
      action: AuditLogAction.OPPORTUNITY_CREATED,
      message: `Oportunidade criada: ${dto.titulo}.`,
      targetType: 'Opportunity',
      targetId: oportunidadeCriada.id,
      userId: user.sub,
      details: {
        clientId: dto.clienteId,
        quoteId: dto.cotacaoId ?? null,
        preContract: dto.preContrato ?? false,
      },
    });

    return oportunidadeCriada;
  }

  async listar(
    user: AuthUser,
    filtros: {
      clienteId?: string;
      etapa?: string;
      situacao?: string;
      modalidadeCadastro?: string;
    },
  ) {
    await this.validarUsuarioInterno(user);

    const permitidas = hasAnyRole(user, ['CONSULTORA'])
      ? [ModalidadeCadastro.CLIENTE, ModalidadeCadastro.LEAD]
      : await modalidadesPermitidas(this.prisma, user);
    if (
      filtros.modalidadeCadastro &&
      !['CLIENTE', 'LEAD'].includes(filtros.modalidadeCadastro)
    )
      throw new BadRequestException('Modalidade de cadastro inválida.');
    const tipos = permitidas.filter(
      (tipo) =>
        !filtros.modalidadeCadastro || tipo === filtros.modalidadeCadastro,
    );
    const where: Prisma.OpportunityWhereInput = {
      client: { modalidadeCadastro: { in: tipos } },
    };

    if (filtros.clienteId) {
      where.clientId = filtros.clienteId;
    }

    if (filtros.etapa) {
      const stage = filtros.etapa as EtapaOportunidade;

      if (!Object.values(EtapaOportunidade).includes(stage)) {
        throw new BadRequestException('Etapa da oportunidade inválida.');
      }

      where.stage = stage;
    }

    if (filtros.situacao) {
      const status = filtros.situacao as SituacaoOportunidade;

      if (!Object.values(SituacaoOportunidade).includes(status)) {
        throw new BadRequestException('Status da oportunidade invalido.');
      }

      where.status = status;
    }

    if (hasAnyRole(user, ['CONSULTORA'])) {
      where.client = {
        modalidadeCadastro: { in: tipos },
        ...cadastroMcg(),
      };
      where.id = { in: await oportunidadesDaConsultora(this.prisma, user.sub, filtros.clienteId) };
    }
    const oportunidades = await this.prisma.opportunity.findMany({
      where,
      include: {
        client: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        quote: true,
        propostas: consultaValorPropostaComercial,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    return oportunidades.map(({ propostas, ...oportunidade }) => ({
      ...oportunidade,
      valorPropostaComercial: valorPropostaComercial(propostas),
    }));
  }

  async atualizarEtapa(
    user: AuthUser,
    id: string,
    dto: AtualizarEtapaOportunidadeDto,
  ) {
    await this.validarUsuarioInterno(user);

    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Oportunidade não encontrada.');
    }
    await this.validarCadastro(user, opportunity.client);
    await this.validarAutoriaOportunidade(user, opportunity.id, opportunity.clientId);

    const perda = resolverPerda(this.situacaoPorEtapa(dto.etapa), dto, opportunity);

    const valorNegociado =
      dto.etapa === EtapaOportunidade.GANHO
        ? await this.obterValorNegociado(opportunity)
        : null;

    if (dto.etapa === EtapaOportunidade.GANHO && !valorNegociado) {
      throw new BadRequestException(
        'Informe o valor do serviço negociado antes de marcar a oportunidade como ganha.',
      );
    }

    const proximaSituacao = this.situacaoPorEtapa(dto.etapa);
    const tipoEvento =
      dto.etapa === EtapaOportunidade.GANHO
        ? TimelineEventType.OPPORTUNITY_WON
        : dto.etapa === EtapaOportunidade.PERDIDO
          ? TimelineEventType.OPPORTUNITY_LOST
          : TimelineEventType.STAGE_CHANGED;
    const tituloEvento =
      dto.etapa === EtapaOportunidade.GANHO
        ? 'Oportunidade ganha'
        : dto.etapa === EtapaOportunidade.PERDIDO
          ? 'Oportunidade perdida'
          : 'Mudança de etapa';
    const descricaoEvento =
      dto.etapa === EtapaOportunidade.GANHO
        ? `A oportunidade "${opportunity.title}" foi marcada como ganha.`
        : dto.etapa === EtapaOportunidade.PERDIDO
          ? `A oportunidade "${opportunity.title}" foi marcada como perdida.`
          : `A oportunidade "${opportunity.title}" avançou para ${dto.etapa}.`;

    const oportunidadeAtualizada = await this.prisma.$transaction(
      async (tx) => {
        const oportunidadeAtualizada = await tx.opportunity.update({
          where: { id },
          data: {
            stage: dto.etapa,
            status: proximaSituacao,
            ...(valorNegociado ? { value: valorNegociado } : {}),
            ...perda,
          },
        });

        await tx.timelineEvent.create({
          data: {
            clientId: opportunity.clientId,
            type: tipoEvento,
            title: tituloEvento,
            description: descricaoEvento + descricaoPerda(perda),
            createdById: user.sub,
            metadata: {
              opportunityId: opportunity.id,
              from: opportunity.stage,
              to: dto.etapa,
              ...historicoPerda(opportunity, perda),
            },
          },
        });

        return oportunidadeAtualizada;
      },
    );

    await this.auditLogsService.create({
      category: AuditLogCategory.CLIENT,
      action: AuditLogAction.OPPORTUNITY_STAGE_CHANGED,
      message: `Etapa da oportunidade alterada para ${dto.etapa}.`,
      targetType: 'Opportunity',
      targetId: id,
      userId: user.sub,
      details: {
        from: opportunity.stage,
        to: dto.etapa,
        ...historicoPerda(opportunity, perda),
      },
    });

    return oportunidadeAtualizada;
  }

  async atualizar(user: AuthUser, id: string, dto: AtualizarOportunidadeDto) {
    await this.validarUsuarioInterno(user);

    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Oportunidade não encontrada.');
    }
    await this.validarCadastro(user, opportunity.client);
    await this.validarAutoriaOportunidade(user, opportunity.id, opportunity.clientId);

    const proximoTitulo =
      dto.titulo !== undefined ? this.normalizarTexto(dto.titulo) : undefined;

    if (dto.titulo !== undefined && !proximoTitulo) {
      throw new BadRequestException('Informe o título da oportunidade.');
    }

    if (dto.cotacaoId) {
      const quote = await this.prisma.quote.findUnique({
        where: { id: dto.cotacaoId },
        select: {
          id: true,
          clientId: true,
        },
      });

      if (!quote || quote.clientId !== opportunity.clientId) {
        throw new BadRequestException('Cotação inválida para este cliente.');
      }
    }

    const proximaEtapa = dto.etapa ?? opportunity.stage;
    const perda = resolverPerda(dto.etapa !== undefined ? this.situacaoPorEtapa(proximaEtapa) : opportunity.status, dto, opportunity);

    const camposAlterados = [
      proximoTitulo !== undefined && proximoTitulo !== opportunity.title
        ? 'título'
        : null,
      dto.cotacaoId !== undefined && dto.cotacaoId !== opportunity.quoteId
        ? 'cotacao'
        : null,
      dto.valor !== undefined &&
      String(dto.valor ?? '') !== String(opportunity.value ?? '')
        ? 'valor'
        : null,
      dto.etapa !== undefined && dto.etapa !== opportunity.stage
        ? 'etapa'
        : null,
      dto.previsaoFechamento !== undefined &&
      String(dto.previsaoFechamento ?? '') !==
        String(opportunity.expectedCloseDate ?? '')
        ? 'previsao de fechamento'
        : null,
      dto.preContrato !== undefined &&
      dto.preContrato !== opportunity.preContract
        ? 'pre-contrato'
        : null,
      dto.observacoesPreContrato !== undefined &&
      this.normalizarTexto(dto.observacoesPreContrato) !==
        opportunity.preContractNotes
        ? 'observações do pré-contrato'
        : null,
      dto.motivoPerda !== undefined &&
      perda.motivoPerda !== opportunity.motivoPerda
        ? 'motivo da perda'
        : null,
      dto.observacaoPerda !== undefined && perda.observacaoPerda !== opportunity.observacaoPerda
        ? 'observações da perda'
        : null,
    ].filter(Boolean);

    const dadosAtualizacao: Prisma.OpportunityUncheckedUpdateInput = {
      ...(proximoTitulo !== undefined
        ? { title: proximoTitulo as string }
        : {}),
      ...(dto.cotacaoId !== undefined ? { quoteId: dto.cotacaoId } : {}),
      ...(dto.valor !== undefined
        ? {
            value: dto.valor === null ? null : new Prisma.Decimal(dto.valor),
          }
        : {}),
      ...(dto.etapa !== undefined
        ? {
            stage: dto.etapa,
            status: this.situacaoPorEtapa(dto.etapa),
          }
        : {}),
      ...(dto.previsaoFechamento !== undefined
        ? {
            expectedCloseDate: dto.previsaoFechamento
              ? new Date(dto.previsaoFechamento)
              : null,
          }
        : {}),
      ...(dto.preContrato !== undefined
        ? { preContract: dto.preContrato }
        : {}),
      ...(dto.observacoesPreContrato !== undefined
        ? { preContractNotes: this.normalizarTexto(dto.observacoesPreContrato) }
        : {}),
      ...perda,
    };

    const oportunidadeAtualizada = await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.opportunity.update({
          where: { id },
          data: dadosAtualizacao,
          include: {
            client: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, role: true },
                },
              },
            },
            quote: true,
          },
        });

        if (camposAlterados.length > 0) {
          await tx.timelineEvent.create({
            data: {
              clientId: opportunity.clientId,
              type: TimelineEventType.NOTE_ADDED,
              title: 'Oportunidade editada',
              description: `Campos atualizados: ${camposAlterados.join(', ')}.` + descricaoPerda(perda),
              createdById: user.sub,
              metadata: {
                opportunityId: id,
                camposAlterados,
                from: opportunity.stage,
                to: proximaEtapa,
                ...historicoPerda(opportunity, perda),
              },
            },
          });
        }

        return updated;
      },
    );

    await this.auditLogsService.create({
      category: AuditLogCategory.CLIENT,
      action: AuditLogAction.CUSTOM,
      message: `Oportunidade editada: ${oportunidadeAtualizada.title}.`,
      targetType: 'Opportunity',
      targetId: id,
      userId: user.sub,
      details: {
        camposAlterados,
        ...historicoPerda(opportunity, perda),
      },
    });

    return oportunidadeAtualizada;
  }

  async excluir(user: AuthUser, id: string) {
    await this.validarUsuarioInterno(user);

    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Oportunidade não encontrada.');
    }

    await this.validarCadastro(user, opportunity.client);
    await this.validarAutoriaOportunidade(user, opportunity.id, opportunity.clientId);

    await this.prisma.$transaction(async (tx) => {
      await tx.timelineEvent.create({
        data: {
          clientId: opportunity.clientId,
          type: TimelineEventType.NOTE_ADDED,
          title: 'Oportunidade excluída',
          description: `Oportunidade excluída: ${opportunity.title}.`,
          createdById: user.sub,
          metadata: {
            opportunityId: id,
            title: opportunity.title,
          },
        },
      });

      await tx.opportunity.delete({
        where: { id },
      });
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.CLIENT,
      action: AuditLogAction.CUSTOM,
      message: `Oportunidade excluída: ${opportunity.title}.`,
      targetType: 'Opportunity',
      targetId: id,
      userId: user.sub,
      details: {
        clientId: opportunity.clientId,
        title: opportunity.title,
        stage: opportunity.stage,
        status: opportunity.status,
      },
    });

    return { message: 'Oportunidade excluída com sucesso.' };
  }
}
