import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { hasAnyRole } from './user-roles';

export type UsuarioEmpresaConsultora = {
  sub: string;
  role: string;
  roles?: string[];
  empresaConsultoraId?: string | null;
  empresaConsultoraAtiva?: boolean;
};

// O vínculo vem do banco em cada autenticação, nunca do corpo ou do JWT antigo.
export function empresaConsultoraDoUsuario(user: UsuarioEmpresaConsultora): string {
  if (!user.empresaConsultoraId || user.empresaConsultoraAtiva !== true) {
    throw new ForbiddenException('Seu usuário precisa estar vinculado a uma empresa consultora ativa.');
  }
  return user.empresaConsultoraId;
}

export function filtroEmpresaConsultora(user: UsuarioEmpresaConsultora): Prisma.ClientWhereInput {
  return hasAnyRole(user, ['CONSULTORA'])
    ? { empresaConsultoraId: empresaConsultoraDoUsuario(user) }
    : {};
}

export function validarEmpresaCadastro(user: UsuarioEmpresaConsultora, cadastro: { empresaConsultoraId?: string | null }) {
  if (hasAnyRole(user, ['CONSULTORA']) && cadastro.empresaConsultoraId !== empresaConsultoraDoUsuario(user)) {
    throw new ForbiddenException('Este cadastro não pertence à sua empresa consultora.');
  }
}

export async function validarEmpresaLead(prisma: Pick<Prisma.TransactionClient, 'client'>, user: UsuarioEmpresaConsultora, leadId: string) {
  if (!hasAnyRole(user, ['CONSULTORA'])) return;
  const cadastro = await prisma.client.findFirst({ where: {
    ...filtroEmpresaConsultora(user),
    OR: [{ leadCadastro: { is: { id: leadId } } }, { sourceLeadId: leadId }],
  }, select: { id: true } });
  if (!cadastro) throw new ForbiddenException('Este lead não pertence à carteira da sua empresa consultora.');
}
