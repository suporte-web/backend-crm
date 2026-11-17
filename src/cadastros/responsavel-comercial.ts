import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { hasAnyRole } from '../common/user-roles';

export const perfisResponsavelComercial = ['ADMIN', 'GESTAO', 'COMERCIAL', 'CONSULTORA'] as const;

export async function resolverResponsavelComercial(
  prisma: Pick<Prisma.TransactionClient, 'user'>,
  user: AuthUser,
  solicitado: string | null | undefined,
  atual?: string | null,
) {
  if (solicitado === undefined) return undefined;
  if (!hasAnyRole(user, perfisResponsavelComercial)) throw new ForbiddenException('Seu perfil não pode atribuir responsáveis comerciais.');
  const id = solicitado || null;
  if (hasAnyRole(user, ['CONSULTORA']) && id !== atual && id !== user.sub) {
    throw new ForbiddenException('Consultoras não podem transferir o responsável comercial.');
  }
  if (hasAnyRole(user, ['CONSULTORA']) && atual && atual !== user.sub && id !== atual) {
    throw new ForbiddenException('Este cadastro possui outro responsável comercial.');
  }
  if (!id) return { id: null, name: '' };
  const responsavel = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, isActive: true, role: true, roles: true } });
  if (!responsavel || (id !== atual && (!responsavel.isActive || !hasAnyRole(responsavel, perfisResponsavelComercial)))) {
    throw new BadRequestException('Selecione um usuário ativo com perfil comercial.');
  }
  return { id: responsavel.id, name: responsavel.name };
}

export async function listarResponsaveisComerciais(prisma: Pick<Prisma.TransactionClient, 'user'>, user: AuthUser) {
  if (!hasAnyRole(user, perfisResponsavelComercial)) throw new ForbiddenException('Seu perfil não pode consultar responsáveis comerciais.');
  return prisma.user.findMany({
    where: hasAnyRole(user, ['CONSULTORA']) ? { id: user.sub, isActive: true } : {
      isActive: true, OR: [{ role: { in: [...perfisResponsavelComercial] } }, { roles: { hasSome: [...perfisResponsavelComercial] } }],
    },
    select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });
}
