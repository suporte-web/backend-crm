import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Client, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  garantirCadastroLead,
  normalizarContatoLead,
} from '../../common/cadastros';
import {
  modalidadesPermitidas,
  validarAcessoCadastro,
  validarAutoriaCadastro,
} from '../../common/permissoes-cadastros';
import { hasAnyRole } from '../../common/user-roles';
import { capturarProspeccao } from '../../common/prospeccao';
import { validarFotoCadastro } from '../../common/foto-cadastro';
import type { AuthUser } from '../auth/types/auth-user.type';
import { AlterarModalidadeDto, AtualizarEtapaCadastroDto, CriarCadastroDto, DadosComerciaisCadastroDto, ETAPAS_FUNIL_COMERCIAL } from './dto/cadastro.dto';

@Injectable()
export class CadastrosService {
  constructor(private readonly prisma: PrismaService) {}

  async atualizarFoto(user: AuthUser, id: string, fotoUrl: string) {
    if (!hasAnyRole(user, ['ADMIN', 'GESTAO', 'COMERCIAL', 'CONSULTORA']))
      throw new ForbiddenException('Seu perfil não pode alterar a foto do cadastro.');
    const foto = validarFotoCadastro(fotoUrl);
    await this.obter(user, id);
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Client" WHERE id = ${id} FOR UPDATE`);
      const cadastro = await tx.client.findUnique({ where: { id } });
      if (!cadastro) throw new NotFoundException('Cadastro não encontrado.');
      const lead = await this.garantirLeadFunil(tx, cadastro, user, cadastro.modalidadeCadastro === 'CLIENTE' ? 'venda_efetivada' : 'entrada_leads');
      const anteriores = lead.metadata && typeof lead.metadata === 'object' && !Array.isArray(lead.metadata) ? lead.metadata : {};
      await tx.lead.update({ where: { id: lead.id }, data: { metadata: { ...anteriores, logoUrl: foto }, updatedById: user.sub } });
      await tx.auditLog.create({ data: { category: 'CLIENT', action: 'CUSTOM', userId: user.sub, targetType: 'Client', targetId: id, message: foto ? 'Foto do cadastro atualizada.' : 'Foto do cadastro removida.' } });
      return { fotoUrl: foto };
    });
  }

  private dadosComerciais(dto: DadosComerciaisCadastroDto) {
    const volume = dto.volumeMensalEstimado?.trim();
    if (volume && !/^(?:\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[,.]\d{1,2})?)$/.test(volume))
      throw new BadRequestException('Informe um volume mensal válido em reais, por exemplo 12.500,00.');
    return {
      ...(dto.fotoUrl !== undefined ? { logoUrl: validarFotoCadastro(dto.fotoUrl) } : {}),
      ...(dto.proximaAcao !== undefined ? { nextAction: dto.proximaAcao.trim() } : {}),
      ...(dto.responsavel !== undefined ? { responsible: dto.responsavel.trim() } : {}),
      ...(dto.volumeMensalEstimado !== undefined ? { monthlyEstimatedValue: dto.volumeMensalEstimado.trim() } : {}),
    };
  }

  private async garantirLeadFunil(tx: Prisma.TransactionClient, cadastro: Client, user: AuthUser, etapa: string) {
    let lead = await tx.lead.findUnique({ where: { cadastroId: cadastro.id } });
    if (!lead && cadastro.sourceLeadId) {
      lead = await tx.lead.findUnique({ where: { id: cadastro.sourceLeadId } });
      if (lead?.cadastroId && lead.cadastroId !== cadastro.id)
        throw new ConflictException('Este lead já está vinculado a outro cadastro.');
      if (lead) lead = await tx.lead.update({ where: { id: lead.id }, data: { cadastroId: cadastro.id } });
    }
    if (lead) return lead;
    const contato = await tx.clientContact.findFirst({ where: { clientId: cadastro.id }, orderBy: { isPrimary: 'desc' } });
    lead = await tx.lead.create({ data: {
      cadastroId: cadastro.id,
      name: contato?.name || cadastro.companyName || 'Contato',
      company: cadastro.companyName,
      email: contato?.email,
      phone: contato?.phone || cadastro.phone,
      ...normalizarContatoLead(contato?.email, contato?.phone || cadastro.phone),
      source: 'manual', status: etapa, notes: cadastro.notes,
      convertidoParaCliente: cadastro.modalidadeCadastro === 'CLIENTE',
      createdAt: cadastro.createdAt,
      createdById: user.sub, updatedById: user.sub,
      prospectedById: cadastro.prospectedById, prospectedByName: cadastro.prospectedByName,
      metadata: { clientId: cadastro.id, ...(cadastro.segment ? { segment: cadastro.segment } : {}) },
      timeline: { create: { type: 'CREATED_MANUAL', title: 'Cadastro incluído no funil', description: 'Acompanhamento comercial vinculado ao cadastro.', createdById: user.sub } },
    } });
    await tx.client.update({ where: { id: cadastro.id }, data: { sourceLeadId: lead.id } });
    await tx.timelineEvent.create({ data: { clientId: cadastro.id, type: 'LEAD_UPDATED', title: 'Cadastro incluído no funil', description: `Acompanhamento comercial iniciado na etapa ${etapa}.`, createdById: user.sub } });
    await tx.auditLog.create({ data: { category: 'CLIENT', action: 'CUSTOM', userId: user.sub, targetType: 'Client', targetId: cadastro.id, message: 'Cadastro vinculado ao funil comercial.', details: { leadId: lead.id, etapa } } });
    return lead;
  }

  async atualizarEtapa(user: AuthUser, id: string, dto: AtualizarEtapaCadastroDto) {
    if (!hasAnyRole(user, ['ADMIN', 'GESTAO', 'COMERCIAL', 'CONSULTORA']))
      throw new ForbiddenException('Seu perfil não pode alterar a etapa do funil.');
    if (!(ETAPAS_FUNIL_COMERCIAL as readonly string[]).includes(dto.etapa))
      throw new BadRequestException('Selecione uma etapa válida do funil comercial.');
    await this.obter(user, id);
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Client" WHERE id = ${id} FOR UPDATE`);
      const cadastro = await tx.client.findUnique({ where: { id } });
      if (!cadastro) throw new NotFoundException('Cadastro não encontrado.');
      const lead = await this.garantirLeadFunil(tx, cadastro, user, dto.etapa);
      const comerciais = this.dadosComerciais(dto);
      if (lead.status === dto.etapa && !Object.keys(comerciais).length) return lead;
      const anteriores = lead.metadata && typeof lead.metadata === 'object' && !Array.isArray(lead.metadata) ? lead.metadata : {};
      const atualizado = await tx.lead.update({ where: { id: lead.id }, data: {
        status: dto.etapa, updatedById: user.sub,
        metadata: { ...anteriores, ...comerciais },
        timeline: { create: { type: 'UPDATED', title: 'Acompanhamento comercial atualizado', description: 'Etapa, próxima ação, responsável ou volume mensal atualizados pelo cadastro.', createdById: user.sub } },
      } });
      await tx.timelineEvent.create({ data: { clientId: id, type: 'LEAD_UPDATED', title: 'Acompanhamento comercial atualizado', description: 'Etapa, próxima ação, responsável ou volume mensal atualizados.', createdById: user.sub } });
      await tx.auditLog.create({ data: { category: 'CLIENT', action: 'CUSTOM', userId: user.sub, targetType: 'Client', targetId: id, message: 'Acompanhamento comercial atualizado no cadastro.', details: { anterior: lead.status, atual: dto.etapa, campos: Object.keys(comerciais) } } });
      return atualizado;
    });
  }

  async listar(user: AuthUser, tipo?: string, busca?: string) {
    const permitidas = await modalidadesPermitidas(this.prisma, user);
    if (tipo && !['CLIENTE', 'LEAD'].includes(tipo))
      throw new BadRequestException('Modalidade de cadastro inválida.');
    const tipos = tipo
      ? permitidas.filter((item) => item === tipo)
      : permitidas;
    const q = busca?.trim();
    return this.prisma.client.findMany({
      where: {
        modalidadeCadastro: { in: tipos },
        ...(hasAnyRole(user, ['CONSULTORA'])
          ? {
              AND: [
                {
                  OR: [
                    { prospectedById: user.sub },
                    { internalOwnerId: user.sub },
                    { leadCadastro: { createdById: user.sub } },
                  ],
                },
              ],
            }
          : {}),
        ...(q
          ? {
              OR: [
                'companyName',
                'legalName',
                'tradeName',
                'document',
                'phone',
              ].map((campo) => ({
                [campo]: { contains: q, mode: 'insensitive' },
              })),
            }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        leadCadastro: {
          select: { id: true, source: true, status: true, email: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  async obter(user: AuthUser, id: string) {
    const cadastro = await this.prisma.client.findUnique({ where: { id } });
    if (!cadastro) throw new NotFoundException('Cadastro não encontrado.');
    await validarAcessoCadastro(this.prisma, user, cadastro.modalidadeCadastro);
    await validarAutoriaCadastro(this.prisma, user, cadastro);
    return cadastro;
  }

  async resolverLead(user: AuthUser, id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead não encontrado.');
    const cadastro = lead.cadastroId
      ? await this.obter(user, lead.cadastroId)
      : await this.prisma.$transaction(async (tx) => {
          await validarAcessoCadastro(this.prisma, user, 'LEAD');
          if (
            hasAnyRole(user, ['CONSULTORA']) &&
            lead.createdById !== user.sub &&
            lead.prospectedById !== user.sub
          )
            throw new NotFoundException('Lead não encontrado.');
          return garantirCadastroLead(tx, lead);
        });
    return { id: cadastro.id, modalidadeCadastro: cadastro.modalidadeCadastro };
  }

  async dadosLead(user: AuthUser, id: string) {
    await this.obter(user, id);
    return this.prisma.lead.findUnique({
      where: { cadastroId: id },
      include: {
        timeline: {
          include: { createdBy: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        observations: {
          include: { createdBy: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        anexos: true,
      },
    });
  }

  async criar(user: AuthUser, dto: CriarCadastroDto) {
    await validarAcessoCadastro(this.prisma, user, dto.modalidadeCadastro);
    const {
      modalidadeCadastro,
      etapaFunil,
      proximaAcao,
      responsavel,
      volumeMensalEstimado,
      fotoUrl,
      dadosLead,
      contacts,
      name,
      registrationDate,
      ...campos
    } = dto;
    const nome = (
      campos.companyName ||
      campos.tradeName ||
      campos.legalName ||
      name
    )?.trim();
    if (!nome)
      throw new BadRequestException('Informe o nome ou a empresa do cadastro.');
    const documento = campos.document?.replace(/\D/g, '') || null;
    if (modalidadeCadastro === 'CLIENTE' && !documento)
      throw new BadRequestException('Informe o documento do cliente.');
    const data = registrationDate ? new Date(registrationDate) : null;
    if (data && Number.isNaN(data.getTime()))
      throw new BadRequestException('Data de cadastro inválida.');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const origem = await capturarProspeccao(tx, user);
        const dados = {
          ...campos,
          companyName: nome,
          document: documento,
          registrationDate: data,
          ...origem,
          modalidadeCadastro,
          internalOwnerId: hasAnyRole(user, ['CONSULTORA'])
            ? user.sub
            : campos.internalOwnerId || user.sub,
          contacts: contacts?.length
            ? {
                create: contacts.map((contato, indice) => ({
                  name: contato.name || contato.nomeContato,
                  role: contato.role || contato.cargo,
                  phone: contato.phone || contato.telefone,
                  email: contato.email,
                  notes:
                    [
                      contato.notes,
                      contato.whatsapp && `WhatsApp: ${contato.whatsapp}`,
                      contato.linkedin && `LinkedIn: ${contato.linkedin}`,
                    ]
                      .filter(Boolean)
                      .join('\n') || null,
                  isPrimary: indice === 0,
                })),
              }
            : undefined,
        } satisfies Prisma.ClientUncheckedCreateInput;
        let cadastro;
        if (modalidadeCadastro === 'LEAD') {
          const principal = contacts?.[0];
          const {
            name: nomeLead,
            email,
            phone,
            company,
            source,
            status,
            notes,
            ...extras
          } = dadosLead ?? {};
          const emailLead = email || principal?.email;
          const telefoneLead = phone || principal?.phone || campos.phone;
          const normalizados = normalizarContatoLead(emailLead, telefoneLead);
          const contatosDuplicados = [
            normalizados.normalizedEmail
              ? { normalizedEmail: normalizados.normalizedEmail }
              : null,
            normalizados.normalizedPhone
              ? { normalizedPhone: normalizados.normalizedPhone }
              : null,
          ].filter((item) => item !== null);
          if (
            contatosDuplicados.length &&
            (await tx.lead.findFirst({ where: { OR: contatosDuplicados } }))
          )
            throw new ConflictException(
              'Já existe um lead com este contato. Abra o cadastro existente.',
            );
          const lead = await tx.lead.create({
            data: {
              name: nomeLead || principal?.name || nome,
              company: company || nome,
              email: emailLead,
              phone: telefoneLead,
              ...normalizados,
              source: source || 'manual',
              status: etapaFunil || status || 'entrada_leads',
              notes: notes || campos.notes,
              metadata: { ...extras, ...this.dadosComerciais({ proximaAcao, responsavel, volumeMensalEstimado, fotoUrl }) },
              createdById: user.sub,
              updatedById: user.sub,
              ...origem,
              timeline: {
                create: {
                  type: 'CREATED_MANUAL',
                  title: 'Lead cadastrado',
                  description: 'Lead criado em Cadastros.',
                  createdById: user.sub,
                },
              },
            },
          });
          const vinculado = await garantirCadastroLead(tx, lead);

          cadastro = await tx.client.update({
            where: { id: vinculado.id },
            data: {
              ...dados,
              contacts: dados.contacts
                ? { deleteMany: {}, ...dados.contacts }
                : undefined,
            },
          });
        } else {
          cadastro = await tx.client.create({ data: dados });
          const lead = await this.garantirLeadFunil(tx, cadastro, user, etapaFunil || 'venda_efetivada');
          const comerciais = this.dadosComerciais({ proximaAcao, responsavel, volumeMensalEstimado, fotoUrl });
          if (Object.keys(comerciais).length) {
            const anteriores = lead.metadata && typeof lead.metadata === 'object' && !Array.isArray(lead.metadata) ? lead.metadata : {};
            await tx.lead.update({ where: { id: lead.id }, data: { metadata: { ...anteriores, ...comerciais } } });
          }
        }
        await tx.timelineEvent.create({
          data: {
            clientId: cadastro.id,
            type: 'LEAD_CREATED',
            title: 'Cadastro criado',
            description: `Cadastro registrado como ${modalidadeCadastro === 'CLIENTE' ? 'Cliente' : 'Lead'}.`,
            createdById: user.sub,
          },
        });
        await tx.auditLog.create({
          data: {
            category: 'CLIENT',
            action: 'CUSTOM',
            userId: user.sub,
            targetType: 'Client',
            targetId: cadastro.id,
            message: 'Cadastro criado na base unificada.',
            details: { modalidadeCadastro },
          },
        });
        return cadastro;
      });
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2002'
      )
        throw new ConflictException(
          'Já existe um cadastro com este documento.',
        );
      throw erro;
    }
  }

  async alterarModalidade(
    user: AuthUser,
    id: string,
    dto: AlterarModalidadeDto,
  ) {
    await this.obter(user, id);
    await validarAcessoCadastro(this.prisma, user, dto.modalidadeCadastro);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "Client" WHERE id = ${id} FOR UPDATE`,
      );
      const cadastro = await tx.client.findUnique({ where: { id } });
      if (!cadastro) throw new NotFoundException('Cadastro não encontrado.');
      if (cadastro.modalidadeCadastro === dto.modalidadeCadastro)
        return cadastro;
      const documento =
        (dto.document ?? cadastro.document)?.replace(/\D/g, '') || null;
      if (dto.modalidadeCadastro === 'CLIENTE' && !documento)
        throw new BadRequestException(
          'Informe o documento antes de alterar para Cliente.',
        );
      if (documento) {
        const duplicado = await tx.client.findFirst({
          where: { document: documento, id: { not: id } },
        });
        if (duplicado)
          throw new ConflictException(
            'Já existe um cadastro com este documento.',
          );
      }
      let lead = await tx.lead.findUnique({ where: { cadastroId: id } });
      if (!lead && dto.modalidadeCadastro === 'LEAD') {
        const principal = await tx.clientContact.findFirst({
          where: { clientId: id },
          orderBy: { isPrimary: 'desc' },
        });
        const normalizados = normalizarContatoLead(
          principal?.email,
          principal?.phone || cadastro.phone,
        );
        const contatosDuplicados = [
          normalizados.normalizedEmail
            ? { normalizedEmail: normalizados.normalizedEmail }
            : null,
          normalizados.normalizedPhone
            ? { normalizedPhone: normalizados.normalizedPhone }
            : null,
        ].filter((item) => item !== null);
        if (
          contatosDuplicados.length &&
          (await tx.lead.findFirst({ where: { OR: contatosDuplicados } }))
        )
          throw new ConflictException(
            'Já existe um lead com este contato. Revise os vínculos antes de alterar a modalidade.',
          );
        lead = await tx.lead.create({
          data: {
            cadastroId: id,
            name: principal?.name || cadastro.companyName || 'Contato',
            company: cadastro.companyName,
            email: principal?.email,
            phone: principal?.phone || cadastro.phone,
            notes: cadastro.notes,
            ...normalizados,
            source: 'manual',
            status: 'entrada_leads',
            createdById: user.sub,
            updatedById: user.sub,
          },
        });
      }
      if (lead) {
        const metadata =
          lead.metadata &&
          typeof lead.metadata === 'object' &&
          !Array.isArray(lead.metadata)
            ? lead.metadata
            : {};
        await tx.lead.update({
          where: { id: lead.id },
          data: {
            convertidoParaCliente: dto.modalidadeCadastro === 'CLIENTE',
            ...(dto.modalidadeCadastro === 'CLIENTE'
              ? { status: 'venda_efetivada' }
              : {}),
            metadata: {
              ...metadata,
              clientId: id,
              conversionTarget:
                dto.modalidadeCadastro === 'CLIENTE' ? 'client' : null,
            },
            updatedById: user.sub,
            timeline: {
              create: {
                type: 'UPDATED',
                title: 'Modalidade do cadastro alterada',
                description: `Cadastro alterado para ${dto.modalidadeCadastro === 'CLIENTE' ? 'Cliente' : 'Lead'}.`,
                createdById: user.sub,
              },
            },
          },
        });
      }
      const resultado = await tx.client.update({
        where: { id },
        data: {
          modalidadeCadastro: dto.modalidadeCadastro,
          document: documento,
          ...(lead ? { sourceLeadId: lead.id } : {}),
        },
      });
      await tx.timelineEvent.create({
        data: {
          clientId: id,
          type: 'LEAD_UPDATED',
          title: 'Modalidade do cadastro alterada',
          description: `Modalidade alterada para ${dto.modalidadeCadastro === 'CLIENTE' ? 'Cliente' : 'Lead'}.`,
          createdById: user.sub,
          metadata: {
            anterior: cadastro.modalidadeCadastro,
            atual: dto.modalidadeCadastro,
          },
        },
      });
      await tx.auditLog.create({
        data: {
          category: 'CLIENT',
          action: 'CUSTOM',
          userId: user.sub,
          targetType: 'Client',
          targetId: id,
          message: 'Modalidade do cadastro alterada.',
          details: {
            anterior: cadastro.modalidadeCadastro,
            atual: dto.modalidadeCadastro,
          },
        },
      });
      return resultado;
    });
  }
}
