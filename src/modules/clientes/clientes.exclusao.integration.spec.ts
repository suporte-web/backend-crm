import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientsService } from './clients.service';
import { LeadsService } from '../leads/leads.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

const banco =
  process.env.CADASTROS_TESTAR_BANCO === '1' ? describe : describe.skip;

banco('Exclusão de cadastros com vínculos reais', () => {
  let prisma: PrismaService;
  beforeAll(async () => {
    if (
      !['localhost', '127.0.0.1'].includes(
        new URL(process.env.DATABASE_URL!).hostname,
      )
    )
      throw new Error('Teste permitido somente no banco local.');
    prisma = new PrismaService(new ConfigService());
    await prisma.onModuleInit();
  });
  afterAll(async () => {
    await prisma?.onModuleDestroy();
  });

  it.each([UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL])(
    'permite %s excluir cadastro Cliente e Lead com histórico, sem apagar propostas e chamados',
    async (role) => {
      const reversao = new Error('REVERTER_EXCLUSAO_CADASTROS');
      await expect(
        prisma.$transaction(
          async (tx) => {
            const usuario = await tx.user.create({
              data: {
                name: 'Teste exclusão',
                email: `${randomUUID()}@example.invalid`,
                passwordHash: 'teste',
                role,
              },
            });
            const autor = { sub: usuario.id, email: usuario.email, role };
            const db = {
              ...tx,
              $transaction: (acao: (cliente: typeof tx) => unknown) => acao(tx),
            } as unknown as PrismaService;
            const servico = new ClientsService(
              db,
              {} as AuditLogsService,
              {} as NotificationsService,
              {} as UsersService,
            );

            for (const modalidadeCadastro of ['CLIENTE', 'LEAD'] as const) {
              const cadastro = await tx.client.create({
                data: {
                  companyName: 'Cadastro para exclusão',
                  modalidadeCadastro,
                },
              });
              const lead = await tx.lead.create({
                data: {
                  name: 'Lead vinculado',
                  cadastroId: cadastro.id,
                  convertidoParaCliente: modalidadeCadastro === 'CLIENTE',
                  timeline: {
                    create: {
                      type: 'CREATED_MANUAL',
                      title: 'Histórico do lead',
                      description: 'Contato inicial',
                    },
                  },
                },
              });
              const cotacao = await tx.quote.create({
                data: {
                  clientId: cadastro.id,
                  origin: 'Curitiba',
                  destination: 'São Paulo',
                  serviceType: 'Transporte',
                  code: randomUUID(),
                },
              });
              const oportunidade = await tx.opportunity.create({
                data: {
                  clientId: cadastro.id,
                  quoteId: cotacao.id,
                  title: 'Oportunidade com histórico',
                },
              });
              const chamado = await tx.ticket.create({
                data: {
                  clientId: cadastro.id,
                  leadId: lead.id,
                  opportunityId: oportunidade.id,
                  quoteId: cotacao.id,
                  subject: 'Solicitação de proposta',
                  description: 'Histórico de atendimento',
                },
              });
              const proposta = await tx.proposta.create({
                data: {
                  clientId: cadastro.id,
                  opportunityId: oportunidade.id,
                  quoteId: cotacao.id,
                  ticketId: chamado.id,
                  titulo: 'Proposta preservada',
                  code: randomUUID(),
                },
              });
              const conversa = await tx.chat.create({
                data: {
                  entityType: 'CLIENTE',
                  entityId: cadastro.id,
                  clientId: cadastro.id,
                  leadId: lead.id,
                },
              });
              await tx.timelineEvent.create({
                data: {
                  clientId: cadastro.id,
                  type: 'NOTE_ADDED',
                  title: 'Contato registrado',
                  description: 'Observação de teste',
                },
              });
              await tx.clientDeletionRequest.create({
                data: {
                  clientId: cadastro.id,
                  requestedById: usuario.id,
                  reason: 'Solicitação anterior',
                },
              });

              const solicitacaoSite = await tx.solicitacaoSite.create({
                data: {
                  tipo: 'COMERCIAL',
                  nome: 'Solicitação de teste',
                  email: 'teste@example.invalid',
                  mensagem: 'Preservar o conteúdo original.',
                },
              });
              // Estas colunas existem no banco legado e têm exclusão restrita.
              await tx.$executeRaw`UPDATE "SolicitacaoSite" SET "leadId" = ${lead.id}, "clientId" = ${cadastro.id} WHERE id = ${solicitacaoSite.id}`;

              // Exercita as duas portas de entrada: cadastro e exclusão direta do funil.
              if (modalidadeCadastro === 'CLIENTE') {
                expect(
                  await servico.requestDeletion(autor, cadastro.id, {
                    reason: 'Teste',
                  }),
                ).toMatchObject({ status: 'APROVADA' });
              } else {
                await new LeadsService(db, {} as NotificationsService).excluir(
                  autor,
                  lead.id,
                );
              }
              expect(
                await tx.client.findUnique({ where: { id: cadastro.id } }),
              ).toBeNull();
              expect(
                await tx.lead.findUnique({ where: { id: lead.id } }),
              ).toBeNull();
              expect(
                await tx.opportunity.findUnique({
                  where: { id: oportunidade.id },
                }),
              ).toBeNull();
              expect(
                await tx.quote.findUnique({ where: { id: cotacao.id } }),
              ).toMatchObject({ clientId: null });
              expect(
                await tx.ticket.findUnique({ where: { id: chamado.id } }),
              ).toMatchObject({
                clientId: null,
                leadId: null,
                opportunityId: null,
              });
              expect(
                await tx.proposta.findUnique({ where: { id: proposta.id } }),
              ).toMatchObject({ clientId: null, opportunityId: null });
              expect(
                await tx.chat.findUnique({ where: { id: conversa.id } }),
              ).toMatchObject({ clientId: null, leadId: null });
              const auditoria = await tx.auditLog.findFirst({
                where: { targetType: 'Client', targetId: cadastro.id },
              });
              expect(auditoria?.details).toHaveProperty('snapshot');
              const [solicitacaoPreservada] = await tx.$queryRaw<
                {
                  leadId: string | null;
                  clientId: string | null;
                  mensagem: string;
                }[]
              >`SELECT "leadId", "clientId", mensagem FROM "SolicitacaoSite" WHERE id = ${solicitacaoSite.id}`;
              expect(solicitacaoPreservada).toMatchObject({
                leadId: null,
                clientId: null,
                mensagem: 'Preservar o conteúdo original.',
              });
            }
            throw reversao;
          },
          { timeout: 30000 },
        ),
      ).rejects.toBe(reversao);
    },
    45000,
  );
});
