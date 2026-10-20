import { ConflictException } from '@nestjs/common';
import { Lead, Prisma } from '@prisma/client';
import { hasAnyRole } from './user-roles';
import { excluirCadastroComHistorico } from './exclusao-cadastros';

type OrigemLead = Pick<
  Lead,
  | 'id'
  | 'name'
  | 'email'
  | 'phone'
  | 'company'
  | 'notes'
  | 'createdAt'
  | 'createdById'
  | 'prospectedById'
  | 'prospectedByName'
  | 'convertidoParaCliente'
>;

export function normalizarContatoLead(
  email?: string | null,
  phone?: string | null,
) {
  return {
    normalizedEmail: email?.trim().toLowerCase() || null,
    normalizedPhone: phone?.replace(/\D/g, '') || null,
  };
}

export async function sincronizarContatoLead(
  tx: Prisma.TransactionClient,
  clientId: string,
  contato: {
    name: string | null;
    email: string | null;
    phone: string | null;
    isPrimary: boolean;
  },
) {
  if (!contato.isPrimary) return;
  await tx.lead.updateMany({
    where: { cadastroId: clientId },
    data: {
      ...(contato.name ? { name: contato.name } : {}),
      email: contato.email,
      phone: contato.phone,
      ...normalizarContatoLead(contato.email, contato.phone),
    },
  });
}

export async function removerCadastroLead(
  tx: Prisma.TransactionClient,
  lead: { cadastroId?: string | null },
  usuario?: { sub: string; role: string; roles?: string[] },
) {
  if (!lead.cadastroId) return;
  if (usuario && hasAnyRole(usuario, ['ADMIN', 'GESTAO', 'COMERCIAL'])) {
    await excluirCadastroComHistorico(tx, lead.cadastroId, usuario.sub, { manterLead: true });
    return;
  }
  const cadastro = await tx.client.findUnique({
    where: { id: lead.cadastroId },
    include: { opportunities: { select: { id: true } } },
  });
  if (!cadastro) return;
  if (cadastro.modalidadeCadastro !== 'LEAD')
    throw new ConflictException(
      'Este lead está vinculado a um Cliente. Preserve o histórico comercial.',
    );
  if (cadastro.opportunities.length)
    throw new ConflictException(
      'Este lead possui oportunidades registradas. Preserve o histórico comercial.',
    );
  await tx.client.delete({ where: { id: cadastro.id } });
}

/** Associa um cadastro completo sem converter o lead ou conceder acesso ao portal. */
export async function garantirCadastroLead(
  tx: Prisma.TransactionClient,
  origem: OrigemLead,
) {
  // Serializa a associação entre canais simultâneos e conversões do mesmo lead.
  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM "Lead" WHERE id = ${origem.id} FOR UPDATE`,
  );
  const lead = await tx.lead.findUniqueOrThrow({ where: { id: origem.id } });
  if (lead.cadastroId) {
    return tx.client.findUniqueOrThrow({ where: { id: lead.cadastroId } });
  }
  const candidatos = await tx.client.findMany({
    where: { sourceLeadId: origem.id },
  });
  if (candidatos.length > 1) {
    throw new ConflictException(
      'Este lead possui mais de um cadastro de origem. Revise os vínculos antes de continuar.',
    );
  }
  const cadastro =
    candidatos[0] ??
    (await tx.client.create({
      data: {
        modalidadeCadastro: origem.convertidoParaCliente ? 'CLIENTE' : 'LEAD',
        sourceLeadId: origem.id,
        companyName: origem.company || origem.name,
        phone: origem.phone,
        notes: origem.notes,
        internalOwnerId: origem.createdById,
        prospectedById: origem.prospectedById,
        prospectedByName: origem.prospectedByName,
        status: 'PENDENTE',
        createdAt: origem.createdAt,
        contacts: {
          create: {
            name: origem.name,
            email: origem.email,
            phone: origem.phone,
            isPrimary: true,
          },
        },
      },
    }));
  await tx.lead.update({
    where: { id: origem.id },
    data: { cadastroId: cadastro.id },
  });
  return cadastro;
}
