import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { OrigemSegmento, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { hasAnyRole } from '../common/user-roles';
import { normalizarCnae, normalizarNomeSegmento } from './segmentos.catalogo';
import { CriarSegmentoDto, SalvarRegraCnaeDto } from './dtos/segmento.dto';

type BancoSegmentos = Pick<Prisma.TransactionClient, 'segmento' | 'regraSegmentoCnae'>;
type Dados = { cnae?: string | null; segment?: string | null; segmentoId?: string | null; segmentoAutomatico?: boolean };
type Atual = Dados & { segmentoOrigem?: OrigemSegmento | null };

export async function classificarCnae(prisma: BancoSegmentos, valor?: string | null) {
  const cnae = normalizarCnae(valor);
  if (!cnae) return null;
  const regras = await prisma.regraSegmentoCnae.findMany({ where: {
    ativa: true, prefixo: { in: [2, 3, 5, 7].map(tamanho => cnae.slice(0, tamanho)) }, segmento: { ativo: true },
  }, include: { segmento: true } });
  const regra = regras.sort((a, b) => b.prefixo.length - a.prefixo.length)[0];
  return regra ? { id: regra.segmento.id, nome: regra.segmento.nome, prefixo: regra.prefixo } : null;
}

export async function encontrarSegmento(prisma: BancoSegmentos, nome: string) {
  const normalizado = normalizarNomeSegmento(nome);
  if (!normalizado) return null;
  const segmentos = await prisma.segmento.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } });
  const encontrados = segmentos.filter(item => [item.nome, ...item.aliases].some(alias => normalizarNomeSegmento(alias) === normalizado));
  return encontrados.length === 1 ? encontrados[0] : null;
}

export async function resolverSegmentoCadastro(prisma: BancoSegmentos, dados: Dados, atual?: Atual, origem: OrigemSegmento = 'MANUAL'): Promise<{
  segmentoId?: string | null; segmentoOrigem?: OrigemSegmento | null; segment?: string | null; cnae?: string | null;
}> {
  const codigo = normalizarCnae(dados.cnae ?? atual?.cnae);
  if (dados.cnae?.trim() && !codigo && dados.cnae !== atual?.cnae) throw new BadRequestException('Informe o CNAE com sete dígitos.');
  const codigoAlterado = dados.cnae !== undefined ? { cnae: codigo || null } : {};
  const manualAlterado = dados.segmentoId !== undefined || (dados.segment !== undefined && dados.segment !== atual?.segment);
  const automatico = dados.segmentoAutomatico ?? (!manualAlterado && (atual?.segmentoOrigem === 'CNAE' || (!atual?.segment && !atual?.segmentoOrigem)));
  if (automatico) {
    const segmento = await classificarCnae(prisma, codigo);
    return { ...codigoAlterado, segmentoId: segmento?.id ?? null, segment: segmento?.nome ?? null, segmentoOrigem: 'CNAE' };
  }
  if (dados.segmentoId) {
    const segmento = await prisma.segmento.findUnique({ where: { id: dados.segmentoId } });
    if (!segmento || (!segmento.ativo && segmento.id !== atual?.segmentoId)) throw new BadRequestException('Selecione um segmento ativo do catálogo.');
    return { ...codigoAlterado, segmentoId: segmento.id, segment: segmento.nome, segmentoOrigem: origem };
  }
  if (dados.segment === undefined || dados.segment === atual?.segment) return codigoAlterado;
  if (!dados.segment?.trim()) return { ...codigoAlterado, segmentoId: null, segment: null, segmentoOrigem: origem };
  const segmento = await encontrarSegmento(prisma, dados.segment);
  if (!segmento) throw new BadRequestException('Selecione um segmento do catálogo ou use a classificação automática por CNAE.');
  return { ...codigoAlterado, segmentoId: segmento.id, segment: segmento.nome, segmentoOrigem: origem };
}

@Injectable()
export class SegmentosService {
  constructor(private readonly prisma: PrismaService) {}
  listar() { return this.prisma.segmento.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }); }
  async classificar(cnae: string) {
    if (cnae && !normalizarCnae(cnae)) throw new BadRequestException('Informe o CNAE com sete dígitos.');
    return { cnae: normalizarCnae(cnae), segmento: await classificarCnae(this.prisma, cnae) };
  }
  private gerenciar(user: AuthUser) {
    if (hasAnyRole(user, ['CONSULTORA']) || !hasAnyRole(user, ['ADMIN', 'GESTAO'])) throw new ForbiddenException('Somente Admin e Gestão podem administrar o catálogo.');
  }
  criar(user: AuthUser, dto: CriarSegmentoDto) {
    this.gerenciar(user);
    return this.prisma.$transaction(async tx => {
      if ((await tx.segmento.findMany()).some(item => [item.nome, ...item.aliases].some(nome => [dto.nome, ...(dto.aliases || [])].some(alias => normalizarNomeSegmento(alias) === normalizarNomeSegmento(nome))))) throw new BadRequestException('Esse nome ou sinônimo já está no catálogo.');
      const segmento = await tx.segmento.create({ data: { nome: dto.nome, codigo: `manual-${randomUUID()}`, aliases: dto.aliases || [] } });
      await tx.auditLog.create({ data: { category: 'CLIENT', action: 'CUSTOM', userId: user.sub, targetType: 'Segmento', targetId: segmento.id, message: 'Segmento cadastrado.', details: { nome: segmento.nome } } });
      return segmento;
    });
  }
  regras(user: AuthUser) { this.gerenciar(user); return this.prisma.regraSegmentoCnae.findMany({ include: { segmento: true }, orderBy: { prefixo: 'asc' } }); }
  salvarRegra(user: AuthUser, dto: SalvarRegraCnaeDto) {
    this.gerenciar(user);
    return this.prisma.$transaction(async tx => {
      if (!(await tx.segmento.findFirst({ where: { id: dto.segmentoId, ativo: true } }))) throw new BadRequestException('Selecione um segmento ativo.');
      const anterior = await tx.regraSegmentoCnae.findUnique({ where: { prefixo: dto.prefixo } });
      const regra = await tx.regraSegmentoCnae.upsert({ where: { prefixo: dto.prefixo }, create: dto, update: dto });
      await tx.auditLog.create({ data: { category: 'CLIENT', action: 'CUSTOM', userId: user.sub, targetType: 'RegraSegmentoCnae', targetId: regra.id, message: 'Regra de segmento por CNAE atualizada.', details: { anterior: anterior?.segmentoId ?? null, atual: regra.segmentoId, prefixo: regra.prefixo, ativa: regra.ativa } } });
      return regra;
    });
  }
}
