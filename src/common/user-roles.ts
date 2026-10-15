import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
export function getUserRoles<T extends string>(user: { role?: T; roles?: T[] } | null | undefined): T[] {
  return user?.roles?.length ? user.roles : user?.role ? [user.role] : [];
}
export function hasAnyRole(user: { role?: string; roles?: string[] } | null | undefined, allowed: readonly string[]): boolean {
  return getUserRoles(user).some((role) => allowed.includes(role));
}
// Keep a primary profile for older integrations; effective access uses all profiles.
export function normalizeUserRoles(roles: UserRole[]): UserRole[] {
  const priority: UserRole[] = ['ADMIN', 'GESTAO', 'LIDER_ATENDIMENTO', 'COMERCIAL', 'OPERACAO', 'MARKETING', 'ATENDIMENTO', 'CLIENTE', 'CONSULTORA'];
  if (!roles.length || roles.some((role) => !priority.includes(role))) {
    throw new BadRequestException('Selecione pelo menos um perfil válido.');
  }
  if (roles.includes('CLIENTE') && roles.some((role) => role !== 'CLIENTE')) {
    throw new BadRequestException('O perfil Cliente não pode ser combinado com perfis internos.');
  }
  return priority.filter((role) => roles.includes(role));
}
