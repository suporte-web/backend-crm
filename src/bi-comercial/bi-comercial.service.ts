import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { getUserRoles, hasAnyRole } from '../common/user-roles';
import { modalidadesPermitidas } from '../common/permissoes-cadastros';
import { listarResponsaveisComerciais, perfisResponsavelComercial } from '../cadastros/responsavel-comercial';
import { ConsultarBiComercialDto } from './dtos/consultar-bi-comercial.dto';
import { filtroEmpresaConsultora, empresaConsultoraDoUsuario } from '../common/empresa-consultora-access';

@Injectable()
export class BiComercialService {
  constructor(private readonly prisma: PrismaService) {}

  async consultar(user: AuthUser, filtros: ConsultarBiComercialDto = {}) {
    if (!hasAnyRole(user, perfisResponsavelComercial)) throw new ForbiddenException('Seu perfil não pode acessar o BI Comercial.');
    const consultora = hasAnyRole(user, ['CONSULTORA']);
    const roles = consultora ? ['CONSULTORA' as const] : getUserRoles(user).filter(role => ['ADMIN', 'GESTAO', 'COMERCIAL'].includes(role));
    const permissoes = await this.prisma.roleScreenPermission.findMany({ where: { role: { in: roles }, screenKey: { in: ['commercialBi', 'opportunities'] } } });
    const permite = (chave: string, padrao: boolean) => roles.some(role => permissoes.find(item => item.role === role && item.screenKey === chave)?.isEnabled ?? padrao);
    if (!permite('commercialBi', true)) throw new ForbiddenException('O BI Comercial está desabilitado para seu perfil.');
    if (filtros.responsavelId && filtros.semResponsavel) {
      throw new ForbiddenException('Selecione um responsável ou os cadastros sem responsável.');
    }
    const escopo = filtroEmpresaConsultora(user);
    if (consultora && filtros.responsavelId) {
      const selecionado = await this.prisma.user.findFirst({ where: {
        id: filtros.responsavelId, empresaConsultoraId: empresaConsultoraDoUsuario(user),
        OR: [{ role: 'CONSULTORA' }, { roles: { has: 'CONSULTORA' } }],
      }, select: { id: true } });
      if (!selecionado) throw new ForbiddenException('Este consultor não pertence à sua empresa.');
    }
    const responsavelId = filtros.responsavelId;
    const modalidades = await modalidadesPermitidas(this.prisma, user);
    const where = { ...escopo, modalidadeCadastro: { in: modalidades }, ...(responsavelId ? { responsavelId } : filtros.semResponsavel ? { responsavelId: null } : {}) };
    const podeOportunidades = permite('opportunities', !consultora);
    const [cadastros, oportunidades, responsaveis] = await Promise.all([
      this.prisma.client.findMany({ where, select: {
        id: true, companyName: true, legalName: true, tradeName: true, segment: true, status: true,
        modalidadeCadastro: true, createdAt: true, updatedAt: true, responsavelId: true,
        responsavel: { select: { id: true, name: true } },
        leadCadastro: { select: { id: true, source: true, status: true, metadata: true, lastInteractionAt: true, convertidoParaCliente: true } },
      }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] }),
      podeOportunidades ? this.prisma.opportunity.findMany({ where: { client: where }, select: {
        id: true, clientId: true, status: true, createdAt: true, motivoPerda: true, preContractNotes: true,
      } }) : Promise.resolve(null),
      listarResponsaveisComerciais(this.prisma, user),
    ]);
    return {
      responsavelFixo: false, empresaConsultoraId: consultora ? empresaConsultoraDoUsuario(user) : null, responsavelId: responsavelId ?? null, responsaveis,
      oportunidades,
      avisos: podeOportunidades ? [] : ['Os indicadores de oportunidades dependem da permissão de acesso a oportunidades.'],
      cadastros: cadastros.map(cadastro => {
        const origem = cadastro.leadCadastro;
        const metadata: Record<string, unknown> = {};
        if (origem?.metadata && typeof origem.metadata === 'object' && !Array.isArray(origem.metadata)) {
          for (const key of ['nextAction', 'monthlyEstimatedValue', 'lastInteractionDate', 'currentStatus']) {
            if (Object.prototype.hasOwnProperty.call(origem.metadata, key)) metadata[key] = origem.metadata[key];
          }
        }
        const legado = origem?.metadata && typeof origem.metadata === 'object' && !Array.isArray(origem.metadata) && typeof origem.metadata.responsible === 'string' ? origem.metadata.responsible : '';
        metadata.responsible = cadastro.responsavel?.name || legado;
        return { ...cadastro, responsavel: cadastro.responsavel?.name ?? legado,
          dadosAcompanhamentoDisponiveis: true, leadCadastro: origem ? { ...origem, metadata } : null };
      }),
    };
  }
}
