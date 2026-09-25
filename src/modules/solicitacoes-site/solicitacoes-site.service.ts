import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { LeadTimelineEventType, Prisma, UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

import { CriarSolicitacaoSiteDto } from './dto/criar-solicitacao-site.dto';
import { ListarSolicitacoesSiteDto } from './dto/listar-solicitacoes-site.dto';
type ContactSubmitStatus = 'idle' | 'enviando' | 'sucesso' | 'erro';

function getMensagemSucesso(area: string) {
  switch (area) {
    case 'Seja um agregado':
      return {
        titulo: 'Cadastro enviado com sucesso!',
        descricao:
          'Recebemos seus dados e documentos. O time responsável por Agregados da Pizzattolog irá analisar as informações enviadas e dará continuidade ao atendimento.',
      };

    case 'Seja um fornecedor':
      return {
        titulo: 'Solicitação enviada com sucesso!',
        descricao:
          'Recebemos seu contato. As informações serão encaminhadas ao time responsável por fornecedores da Pizzattolog.',
      };

    case 'Frota e Manutenção':
      return {
        titulo: 'Solicitação enviada com sucesso!',
        descricao:
          'Recebemos sua mensagem e ela será direcionada ao time de Frota e Manutenção da Pizzattolog.',
      };

    case 'Marketing e Comunicação':
      return {
        titulo: 'Solicitação enviada com sucesso!',
        descricao:
          'Recebemos sua mensagem e ela será direcionada ao time de Marketing e Comunicação da Pizzattolog.',
      };

    case 'Financeiro':
      return {
        titulo: 'Solicitação enviada com sucesso!',
        descricao:
          'Recebemos sua mensagem e ela será direcionada ao time Financeiro da Pizzattolog para análise.',
      };

    case 'Jurídico':
      return {
        titulo: 'Solicitação enviada com sucesso!',
        descricao:
          'Recebemos sua mensagem e ela será direcionada ao time Jurídico da Pizzattolog.',
      };

    case 'Fiscal':
      return {
        titulo: 'Solicitação enviada com sucesso!',
        descricao:
          'Recebemos sua mensagem e ela será direcionada ao time Fiscal da Pizzattolog.',
      };

    default:
      return {
        titulo: 'Solicitação enviada com sucesso!',
        descricao:
          'Recebemos suas informações. O time responsável da Pizzattolog irá analisar sua solicitação e dará continuidade ao atendimento.',
      };
  }
}

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

          aceitePrivacidade: dto.aceitePrivacidade ?? false,

          aceiteComunicacoes: dto.aceiteComunicacoes ?? false,
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

  async adicionarAnexos(
    solicitacaoId: string,
    arquivos: Express.Multer.File[],
  ) {
    const solicitacao = await this.prisma.solicitacaoSite.findUnique({
      where: {
        id: solicitacaoId,
      },

      select: {
        id: true,
        tipo: true,
      },
    });

    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada.');
    }

    if (!arquivos || arquivos.length === 0) {
      throw new BadRequestException('Nenhum arquivo foi enviado.');
    }

    const anexos = await this.prisma.$transaction(
      arquivos.map((arquivo) =>
        this.prisma.anexoSolicitacaoSite.create({
          data: {
            solicitacaoId,

            nomeArquivo: arquivo.filename,

            nomeArquivoOriginal: arquivo.originalname,

            tipoArquivo: arquivo.mimetype,

            tamanho: arquivo.size,

            url: `solicitacoes-site/${arquivo.filename}`,
          },
        }),
      ),
    );

    return {
      sucesso: true,

      mensagem: 'Anexos enviados com sucesso.',

      anexos,
    };
  }

  async buscarAnexo(solicitacaoId: string, anexoId: string) {
    const anexo = await this.prisma.anexoSolicitacaoSite.findFirst({
      where: {
        id: anexoId,
        solicitacaoId,
      },
    });

    if (!anexo) {
      throw new NotFoundException('Anexo não encontrado.');
    }

    return anexo;
  }

  async listar(filtros: ListarSolicitacoesSiteDto) {
    const { tipo, excluirTipo, status, departamento, busca } = filtros;

    const solicitacoes = await this.prisma.solicitacaoSite.findMany({
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
    const solicitacao = await this.prisma.solicitacaoSite.findUnique({
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
      throw new NotFoundException('Solicitação não encontrada.');
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

    await this.notificationsService.notifyRoles(
      [UserRole.COMERCIAL, UserRole.ADMIN],
      {
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
