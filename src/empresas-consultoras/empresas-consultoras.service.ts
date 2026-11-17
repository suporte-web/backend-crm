import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { hasAnyRole } from '../common/user-roles';
import { AtualizarEmpresaConsultoraDto, CriarEmpresaConsultoraDto, VincularCarteiraEmpresaDto } from './dtos/empresa-consultora.dto';

const pessoa = { id: true, name: true, email: true, isActive: true, role: true, roles: true, empresaConsultoraId: true } as const;
const consultores = { OR: [{ role: 'CONSULTORA' as const }, { roles: { has: 'CONSULTORA' as const } }] };

@Injectable()
export class EmpresasConsultorasService {
  constructor(private readonly prisma: PrismaService) {}

  private autorizar(user: AuthUser) {
    if (hasAnyRole(user, ['CONSULTORA']) || !hasAnyRole(user, ['ADMIN', 'GESTAO'])) {
      throw new ForbiddenException('Somente Admin e Gestão podem administrar empresas consultoras.');
    }
  }

  private async transacao<T>(executar: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(executar, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError) {
        if (erro.code === 'P2002') throw new ConflictException('Já existe uma empresa com esse CNPJ.');
        if (erro.code === 'P2034') throw new ConflictException('Os vínculos foram alterados. Atualize a tela e tente novamente.');
      }
      throw erro;
    }
  }

  private async empresa(tx: Prisma.TransactionClient, id: string, exigirAtiva = false) {
    const empresa = await tx.empresaConsultora.findUnique({ where: { id } });
    if (!empresa) throw new NotFoundException('Empresa consultora não encontrada.');
    if (exigirAtiva && !empresa.ativa) throw new BadRequestException('A empresa consultora está inativa.');
    return empresa;
  }

  private auditar(tx: Prisma.TransactionClient, user: AuthUser, id: string, message: string, details: Prisma.InputJsonObject, targetType = 'EmpresaConsultora') {
    return tx.auditLog.create({ data: { category: 'CLIENT', action: 'CUSTOM', userId: user.sub, targetType, targetId: id, message, details } });
  }

  listar(user: AuthUser) {
    this.autorizar(user);
    return this.prisma.empresaConsultora.findMany({
      include: { usuarios: { select: pessoa, orderBy: { name: 'asc' } }, _count: { select: { cadastros: true } } },
      orderBy: [{ nome: 'asc' }, { id: 'asc' }],
    });
  }

  usuarios(user: AuthUser) {
    this.autorizar(user);
    return this.prisma.user.findMany({ where: consultores, select: pessoa, orderBy: { name: 'asc' } });
  }

  criar(user: AuthUser, dto: CriarEmpresaConsultoraDto) {
    this.autorizar(user);
    return this.transacao(async tx => {
      const empresa = await tx.empresaConsultora.create({ data: { nome: dto.nome, cnpj: dto.cnpj || null } });
      await this.auditar(tx, user, empresa.id, 'Empresa consultora cadastrada.', { nome: empresa.nome });
      return empresa;
    });
  }

  atualizar(user: AuthUser, id: string, dto: AtualizarEmpresaConsultoraDto) {
    this.autorizar(user);
    return this.transacao(async tx => {
      const anterior = await this.empresa(tx, id);
      const atual = await tx.empresaConsultora.update({ where: { id }, data: { nome: dto.nome, cnpj: dto.cnpj, ativa: dto.ativa } });
      await this.auditar(tx, user, id, 'Empresa consultora atualizada.', { anterior: { nome: anterior.nome, cnpj: anterior.cnpj, ativa: anterior.ativa }, atual: { nome: atual.nome, cnpj: atual.cnpj, ativa: atual.ativa } });
      return atual;
    });
  }

  vincularUsuario(user: AuthUser, id: string, usuarioId: string, vincular: boolean) {
    this.autorizar(user);
    return this.transacao(async tx => {
      await this.empresa(tx, id, vincular);
      const usuario = await tx.user.findUnique({ where: { id: usuarioId }, select: pessoa });
      if (!usuario || !hasAnyRole(usuario, ['CONSULTORA'])) throw new BadRequestException('Selecione um usuário com perfil CONSULTORA.');
      if (vincular && !usuario.isActive) throw new BadRequestException('O usuário precisa estar ativo.');
      if (!vincular && usuario.empresaConsultoraId !== id) throw new ConflictException('O usuário não está vinculado a esta empresa.');
      const empresaConsultoraId = vincular ? id : null;
      const atualizado = await tx.user.update({ where: { id: usuarioId }, data: { empresaConsultoraId }, select: pessoa });
      await this.auditar(tx, user, usuarioId, 'Vínculo de usuário com empresa consultora alterado.', { anterior: usuario.empresaConsultoraId, atual: empresaConsultoraId, carteiraTransferida: false }, 'User');
      return atualizado;
    });
  }

  async carteira(user: AuthUser, id: string) {
    this.autorizar(user);
    await this.empresa(this.prisma, id);
    return this.prisma.client.findMany({ where: { OR: [
      { empresaConsultoraId: id },
      { empresaConsultoraId: null, responsavel: { is: { empresaConsultoraId: id, ...consultores } } },
    ] }, select: { id: true, companyName: true, modalidadeCadastro: true, empresaConsultoraId: true, responsavelId: true, responsavel: { select: { id: true, name: true } } }, orderBy: { companyName: 'asc' } });
  }

  vincularCarteira(user: AuthUser, id: string, dto: VincularCarteiraEmpresaDto) {
    this.autorizar(user);
    return this.transacao(async tx => {
      await this.empresa(tx, id, true);
      const cadastros = await tx.client.findMany({ where: { id: { in: dto.cadastroIds } }, include: { responsavel: { select: { empresaConsultoraId: true, role: true, roles: true } } } });
      if (cadastros.length !== dto.cadastroIds.length || cadastros.some(item =>
        item.empresaConsultoraId !== null || item.responsavel?.empresaConsultoraId !== id || !hasAnyRole(item.responsavel, ['CONSULTORA'])
      )) throw new ConflictException('A carteira mudou ou contém cadastros de outra empresa. Confira a prévia novamente.');
      if (dto.aplicar === true) for (const cadastro of cadastros) {
        await tx.client.update({ where: { id: cadastro.id }, data: { empresaConsultoraId: id } });
        await this.auditar(tx, user, cadastro.id, 'Cadastro vinculado à empresa consultora após conferência da carteira.', { anterior: null, atual: id, responsavelId: cadastro.responsavelId }, 'Client');
      }
      return { aplicado: dto.aplicar === true, quantidade: cadastros.length, cadastroIds: cadastros.map(item => item.id) };
    });
  }

  transferirCadastro(user: AuthUser, cadastroId: string, empresaId: string | null) {
    this.autorizar(user);
    return this.transacao(async tx => {
      if (empresaId) await this.empresa(tx, empresaId, true);
      const cadastro = await tx.client.findUnique({ where: { id: cadastroId }, include: { responsavel: { select: { empresaConsultoraId: true } } } });
      if (!cadastro) throw new NotFoundException('Cadastro não encontrado.');
      const responsavelId = cadastro.responsavel && cadastro.responsavel.empresaConsultoraId !== empresaId ? null : cadastro.responsavelId;
      await tx.client.update({ where: { id: cadastroId }, data: { empresaConsultoraId: empresaId, responsavelId } });
      await this.auditar(tx, user, cadastroId, 'Empresa consultora do cadastro alterada pela gestão.', { empresaAnterior: cadastro.empresaConsultoraId, empresaAtual: empresaId, responsavelAnterior: cadastro.responsavelId, responsavelAtual: responsavelId }, 'Client');
      return { id: cadastroId, empresaConsultoraId: empresaId, responsavelId };
    });
  }
}
