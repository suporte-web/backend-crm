import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CadastrosService } from './cadastros.service';
import { LeadsService } from '../leads/leads.service';
import { NotificationsService } from '../notifications/notifications.service';

const banco =
  process.env.CADASTROS_TESTAR_BANCO === '1' ? describe : describe.skip;
banco('Etapa do cadastro no mesmo registro consultado pelos painéis', () => {
  it('sincroniza criação, edição e alterações pelo funil sem duplicar o Lead', async () => {
    if (
      !['localhost', '127.0.0.1'].includes(
        new URL(process.env.DATABASE_URL!).hostname,
      )
    )
      throw new Error('Teste permitido somente no banco local.');
    const prisma = new PrismaService(new ConfigService());
    const reversao = new Error('REVERTER_TESTE_ETAPAS');
    try {
      await expect(
        prisma.$transaction(
          async (tx) => {
            const usuario = await tx.user.create({
              data: {
                name: 'Teste funil',
                email: `${randomUUID()}@example.invalid`,
                passwordHash: 'teste',
                role: 'COMERCIAL',
              },
            });
            const autor = {
              sub: usuario.id,
              email: usuario.email,
              role: usuario.role,
            };
            const db = {
              ...tx,
              $transaction: (acao: (cliente: typeof tx) => unknown) => acao(tx),
            } as unknown as PrismaService;
            const servico = new CadastrosService(db);
            for (const modalidadeCadastro of ['CLIENTE', 'LEAD'] as const) {
              const cadastro = await servico.criar(autor, {
                modalidadeCadastro,
                companyName: 'Teste de etapa',
                etapaFunil: 'homologacao',
                proximaAcao: 'Contato inicial',
                responsavel: 'MCG',
                volumeMensalEstimado: '12.500,50',
                fotoUrl: 'data:image/png;base64,iVBORw0KGgo=',
                document:
                  modalidadeCadastro === 'CLIENTE'
                    ? String(
                        BigInt(
                          '0x' + randomUUID().replaceAll('-', '').slice(0, 16),
                        ),
                      ).slice(0, 14)
                    : undefined,
              });
              const lead = await servico.dadosLead(autor, cadastro.id);
              expect(lead?.status).toBe('homologacao');
              expect(lead?.metadata).toMatchObject({
                logoUrl: 'data:image/png;base64,iVBORw0KGgo=',
              });
              await servico.atualizarFoto(autor, cadastro.id, '');
              expect(
                (await servico.dadosLead(autor, cadastro.id))?.metadata,
              ).toMatchObject({
                logoUrl: '',
                responsible: 'MCG',
                nextAction: 'Contato inicial',
              });
              await servico.atualizarFoto(
                autor,
                cadastro.id,
                'data:image/png;base64,iVBORw0KGgo=',
              );
              expect(
                (await servico.dadosLead(autor, cadastro.id))?.metadata,
              ).toMatchObject({
                logoUrl: 'data:image/png;base64,iVBORw0KGgo=',
                monthlyEstimatedValue: '12.500,50',
              });
              expect(lead?.metadata).toMatchObject({
                nextAction: 'Contato inicial',
                responsible: 'MCG',
                monthlyEstimatedValue: '12.500,50',
              });
              await servico.atualizarEtapa(autor, cadastro.id, {
                etapa: 'cotacao',
                proximaAcao: 'Enviar proposta',
                responsavel: 'Maria',
                volumeMensalEstimado: '15.000,00',
              });
              expect(
                await tx.lead.findUnique({ where: { id: lead!.id } }),
              ).toMatchObject({ status: 'cotacao', cadastroId: cadastro.id });
              expect(
                (await servico.dadosLead(autor, cadastro.id))?.metadata,
              ).toMatchObject({
                nextAction: 'Enviar proposta',
                responsible: 'Maria',
                monthlyEstimatedValue: '15.000,00',
              });
              await new LeadsService(db, {} as NotificationsService).update(
                autor,
                lead!.id,
                { status: 'pos_venda' },
              );
              expect(await servico.dadosLead(autor, cadastro.id)).toMatchObject(
                { id: lead!.id, status: 'pos_venda' },
              );
              expect(
                await tx.lead.count({ where: { cadastroId: cadastro.id } }),
              ).toBe(1);
            }
            const antigo = await tx.client.create({
              data: { companyName: 'Cliente antigo sem lead' },
            });
            await servico.atualizarEtapa(autor, antigo.id, {
              etapa: 'cotacao',
            });
            expect(await servico.dadosLead(autor, antigo.id)).toMatchObject({
              status: 'cotacao',
              cadastroId: antigo.id,
            });
            throw reversao;
          },
          { timeout: 30000 },
        ),
      ).rejects.toBe(reversao);
    } finally {
      await prisma.onModuleDestroy();
    }
  }, 45000);
});
