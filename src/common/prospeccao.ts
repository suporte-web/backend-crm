import { BadRequestException } from '@nestjs/common';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import type { Prisma } from '@prisma/client';
import type { AuthUser } from '../modules/auth/types/auth-user.type';
import { hasAnyRole } from './user-roles';

export class FiltrosProspeccaoDto {
  @IsOptional() @IsIn(['todos', 'consultoras']) origemProspeccao?: string;
  @IsOptional() @IsString() consultoraId?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) criadoDe?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) criadoAte?: string;
}

export function dadosProspeccao(user: {
  sub: string;
  role: string;
  roles?: string[];
  name?: string;
  email?: string;
}) {
  return hasAnyRole(user, ['CONSULTORA'])
    ? {
        prospectedById: user.sub,
        prospectedByName: user.name ?? user.email ?? 'Consultora',
      }
    : {};
}

// A autoria vem da sessão; o nome é consultado no servidor, não enviado no DTO.
export async function capturarProspeccao(
  prisma: Pick<Prisma.TransactionClient, 'user'>,
  user: AuthUser,
) {
  if (!hasAnyRole(user, ['CONSULTORA'])) return {};
  const author = await prisma.user.findUnique({
    where: { id: user.sub },
    select: { name: true },
  });
  return dadosProspeccao({ ...user, name: author?.name });
}

export function filtroProspeccao(filters: FiltrosProspeccaoDto) {
  const where: {
    prospectedById?: string;
    prospectedByName?: { not: null };
    createdAt?: { gte?: Date; lt?: Date };
  } = {};
  if (filters.origemProspeccao === 'consultoras')
    where.prospectedByName = { not: null };
  if (filters.consultoraId) {
    where.prospectedById = filters.consultoraId;
    delete where.prospectedByName;
  }
  if (filters.criadoDe || filters.criadoAte) {
    const start = filters.criadoDe
      ? new Date(`${filters.criadoDe}T00:00:00-03:00`)
      : undefined;
    const end = filters.criadoAte
      ? new Date(`${filters.criadoAte}T00:00:00-03:00`)
      : undefined;
    const valid = (text: string | undefined, date: Date | undefined) =>
      !text ||
      (date &&
        /^\d{4}-\d{2}-\d{2}$/.test(text) &&
        !isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === text);
    if (
      !valid(filters.criadoDe, start) ||
      !valid(filters.criadoAte, end) ||
      (start && end && start > end)
    )
      throw new BadRequestException('Período de cadastro inválido.');
    if (end) end.setTime(end.getTime() + 86400000);
    where.createdAt = {
      ...(start ? { gte: start } : {}),
      ...(end ? { lt: end } : {}),
    };
  }
  return where;
}
