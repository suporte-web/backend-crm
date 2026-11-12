import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../modules/auth/types/auth-user.type';
import { hasAnyRole } from './user-roles';

export function isConsultora(user: AuthUser) {
  return hasAnyRole(user, ['CONSULTORA']);
}

export async function assertOpportunityAccess(
  prisma: PrismaService,
  user: AuthUser,
) {
  if (isConsultora(user)) {
    const permission = await prisma.roleScreenPermission.findUnique({
      where: {
        role_screenKey: { role: 'CONSULTORA', screenKey: 'opportunities' },
      },
      select: { isEnabled: true },
    });
    if (permission?.isEnabled) return;
  } else if (hasAnyRole(user, ['ADMIN', 'GESTAO', 'COMERCIAL'])) {
    return;
  }
  throw new ForbiddenException(
    'Você não tem permissão para acessar oportunidades.',
  );
}

export function assertOpportunityOwner(
  user: AuthUser,
  client: { internalOwnerId: string | null },
) {
  if (isConsultora(user) && client.internalOwnerId !== user.sub) {
    throw new ForbiddenException(
      'Este cadastro não está sob sua responsabilidade.',
    );
  }
}
