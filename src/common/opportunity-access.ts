import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/types/auth-user.type';
import { hasAnyRole } from './user-roles';
import { validarEmpresaCadastro } from './empresa-consultora-access';

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
  client: { internalOwnerId: string | null; responsavelId?: string | null; empresaConsultoraId?: string | null },
) {
  validarEmpresaCadastro(user, client);
}
