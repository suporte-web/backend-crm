import { Prisma, StatusProposta } from '@prisma/client';

/** A versão mais recente ainda vigente é a referência visual, inclusive durante a elaboração. */
export const consultaValorPropostaComercial = {
  where: { status: { notIn: [StatusProposta.CANCELADA, StatusProposta.EXPIRADA] } },
  orderBy: [{ createdAt: 'desc' }, { versao: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
  take: 1,
  select: { valor: true },
} satisfies Prisma.PropostaFindManyArgs;

export function valorPropostaComercial(propostas?: readonly { valor: Prisma.Decimal | null }[]): string | null {
  return propostas?.[0]?.valor?.toString() ?? null;
}
