import { ForbiddenException } from '@nestjs/common';
import { ModalidadeCadastro, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getUserRoles, hasAnyRole } from './user-roles';
import { filtroEmpresaConsultora, validarEmpresaCadastro, type UsuarioEmpresaConsultora } from './empresa-consultora-access';

type Usuario = { role: string; roles?: string[] };

export function filtroResponsavelCadastro(user: UsuarioEmpresaConsultora) {
  return filtroEmpresaConsultora(user);
}

export async function modalidadesPermitidas(
  prisma: PrismaService,
  user: Usuario,
): Promise<ModalidadeCadastro[]> {
  const perfis = hasAnyRole(user, ['CONSULTORA'])
    ? ['CONSULTORA']
    : getUserRoles(user).filter((role) =>
        ['ADMIN', 'GESTAO', 'COMERCIAL', 'MARKETING'].includes(role),
      );
  if (!perfis.length)
    throw new ForbiddenException(
      'Você não tem permissão para acessar os cadastros.',
    );
  const permissoes = await prisma.roleScreenPermission.findMany({
    where: { role: { in: perfis as UserRole[] } },
  });
  const permite = (chave: string) =>
    perfis.some((role) => {
      const cadastro = permissoes.find(
        (item) => item.role === role && item.screenKey === 'cadastros',
      );
      if (cadastro && !cadastro.isEnabled) return false;
      return (
        permissoes.find(
          (item) => item.role === role && item.screenKey === chave,
        )?.isEnabled ?? true
      );
    });
  return [
    permite('clients') ? ModalidadeCadastro.CLIENTE : null,
    permite('leads') ? ModalidadeCadastro.LEAD : null,
  ].filter((tipo): tipo is ModalidadeCadastro => tipo !== null);
}

export async function validarAutoriaCadastro(
  _prisma: PrismaService,
  user: UsuarioEmpresaConsultora,
  cadastro: {
    id: string;
    prospectedById: string | null;
    internalOwnerId: string | null;
    responsavelId?: string | null;
    empresaConsultoraId?: string | null;
  },
) {
  validarEmpresaCadastro(user, cadastro);
}

export async function validarAcessoCadastro(
  prisma: PrismaService,
  user: Usuario,
  tipo: ModalidadeCadastro,
) {
  if (!(await modalidadesPermitidas(prisma, user)).includes(tipo)) {
    throw new ForbiddenException(
      'Você não tem permissão para acessar esta modalidade de cadastro.',
    );
  }
}
