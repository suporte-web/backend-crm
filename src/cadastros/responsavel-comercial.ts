import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { hasAnyRole } from '../common/user-roles';
import { empresaConsultoraDoUsuario } from '../common/empresa-consultora-access';

export const perfisResponsavelComercial = ['ADMIN', 'GESTAO', 'COMERCIAL', 'CONSULTORA'] as const;

export async function resolverResponsavelComercial(
  prisma: Pick<Prisma.TransactionClient, 'user'>,
  user: AuthUser,
  solicitado: string | null | undefined,
  atual?: string | null,
  empresaCadastro?: string | null,
) {
  if (solicitado === undefined) return undefined;
  if (!hasAnyRole(user, perfisResponsavelComercial)) throw new ForbiddenException('Seu perfil não pode atribuir responsáveis comerciais.');
  const id = solicitado || null;
  const consultora = hasAnyRole(user, ['CONSULTORA']);
  const empresaUsuario = consultora ? empresaConsultoraDoUsuario(user) : null;
  if (!id) {
    if (consultora) throw new ForbiddenException('Selecione um responsável da sua empresa consultora.');
    return { id: null, name: '', empresaConsultoraId: empresaCadastro ?? null };
  }
  const responsavel = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, isActive: true, role: true, roles: true, empresaConsultoraId: true, empresaConsultora: { select: { ativa: true } } } });
  if (!responsavel || (id !== atual && (!responsavel.isActive || !hasAnyRole(responsavel, perfisResponsavelComercial)))) {
    throw new BadRequestException('Selecione um usuário ativo com perfil comercial.');
  }
  if (consultora && (responsavel.empresaConsultoraId !== empresaUsuario ||
      !hasAnyRole(responsavel, ['CONSULTORA']) || !responsavel.empresaConsultora?.ativa)) {
    throw new ForbiddenException('Selecione um consultor da sua empresa.');
  }
  if (empresaCadastro !== undefined && id !== atual &&
      (responsavel.empresaConsultoraId ?? null) !== empresaCadastro) {
    throw new BadRequestException('O responsável deve pertencer à empresa do cadastro. Altere a empresa pela gestão da carteira.');
  }
  if (responsavel.empresaConsultoraId && !responsavel.empresaConsultora?.ativa) {
    throw new BadRequestException('A empresa consultora do responsável está inativa.');
  }
  return { id: responsavel.id, name: responsavel.name, empresaConsultoraId: responsavel.empresaConsultoraId ?? null };
}

export async function listarResponsaveisComerciais(prisma: Pick<Prisma.TransactionClient, 'user'>, user: AuthUser) {
  if (!hasAnyRole(user, perfisResponsavelComercial)) throw new ForbiddenException('Seu perfil não pode consultar responsáveis comerciais.');
  return prisma.user.findMany({
    where: hasAnyRole(user, ['CONSULTORA']) ? {
      empresaConsultoraId: empresaConsultoraDoUsuario(user), isActive: true,
      OR: [{ role: 'CONSULTORA' }, { roles: { has: 'CONSULTORA' } }],
    } : {
      isActive: true, OR: [{ role: { in: [...perfisResponsavelComercial] } }, { roles: { hasSome: [...perfisResponsavelComercial] } }],
    },
    select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });
}
