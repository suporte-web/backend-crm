import { Prisma } from '@prisma/client';
import { desvincularSolicitacoesSite } from './solicitacoes-site-vinculos';

/** Remove o cadastro sem apagar chamados, conversas, cotações e propostas independentes. */
export async function excluirCadastroComHistorico(
  tx: Prisma.TransactionClient,
  id: string,
  autorId: string,
  opcoes: { motivo?: string | null; manterLead?: boolean } = {},
) {
  const cadastro = await tx.client.findUnique({
    where: { id },
    include: {
      contacts: true,
      documents: true,
      opportunities: true,
      timelineEvents: true,
      leadCadastro: {
        include: { timeline: true, observations: true, anexos: true },
      },
    },
  });
  if (!cadastro) return;

  await tx.auditLog.create({
    data: {
      category: 'CLIENT',
      action: 'CUSTOM',
      userId: autorId,
      targetType: 'Client',
      targetId: id,
      message:
        'Cadastro excluído por usuário autorizado, incluindo seu histórico cadastral.',
      details: {
        motivo: opcoes.motivo ?? null,
        snapshot: JSON.stringify(cadastro),
      },
    },
  });

  const lead = cadastro.leadCadastro;
  await desvincularSolicitacoesSite(tx, { leadId: lead?.id, clientId: id });
  if (lead && !opcoes.manterLead) {
    await tx.leadDeletionRequest.updateMany({
      where: { leadId: lead.id, status: 'PENDENTE' },
      data: {
        status: 'CANCELADA',
        approvedById: autorId,
        decidedAt: new Date(),
        managementResponse: 'Cadastro excluído por usuário autorizado.',
        leadSnapshot: JSON.stringify(lead),
      },
    });
    await tx.ticket.updateMany({
      where: { leadId: lead.id },
      data: { leadId: null },
    });
    await tx.chat.updateMany({
      where: { leadId: lead.id },
      data: { leadId: null },
    });
    await tx.leadImportRowResult.updateMany({
      where: { leadId: lead.id },
      data: { leadId: null },
    });
    await tx.lead.delete({ where: { id: lead.id } });
  }

  // As oportunidades pertencem ao cadastro; seus documentos e atendimentos podem continuar existindo.
  await tx.proposta.updateMany({
    where: { opportunity: { clientId: id } },
    data: { opportunityId: null },
  });
  await tx.ticket.updateMany({
    where: { opportunity: { clientId: id } },
    data: { opportunityId: null },
  });
  await tx.proposta.updateMany({
    where: { clientId: id },
    data: { clientId: null },
  });
  await tx.quote.updateMany({
    where: { clientId: id },
    data: { clientId: null },
  });
  await tx.ticket.updateMany({
    where: { clientId: id },
    data: { clientId: null },
  });
  await tx.chat.updateMany({
    where: { clientId: id },
    data: { clientId: null },
  });
  await tx.clientDeletionRequest.updateMany({
    where: { clientId: id, status: 'PENDENTE' },
    data: {
      status: 'CANCELADA',
      approvedById: autorId,
      decidedAt: new Date(),
      managementResponse: 'Cadastro excluído por usuário autorizado.',
    },
  });
  await tx.clientDeletionRequest.updateMany({
    where: { clientId: id },
    data: { clientId: null },
  });
  await tx.client.delete({ where: { id } });

  // O acesso ao portal é desativado; o usuário continua disponível na autoria do histórico.
  if (cadastro.userId) {
    await tx.user.updateMany({
      where: { id: cadastro.userId, role: 'CLIENTE' },
      data: { isActive: false },
    });
  }
}
