import { ConfigService } from '@nestjs/config';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AtendimentoSacService } from '../atendimento-sac/atendimento-sac.service';
import { VisitasService } from './visitas.service';
const banco =
  process.env.VISITAS_TESTAR_BANCO === '1' ? describe : describe.skip;
banco('Visitas integradas ao SAC com PostgreSQL real', () => {
  let prisma: PrismaService;
  beforeAll(async () => {
    prisma = new PrismaService(new ConfigService());
    await prisma.onModuleInit();
  });
  afterAll(async () => {
    await prisma.onModuleDestroy();
  });
  it('cria, atribui, reagenda, revisa, valida, gera SAC e conclui sem duplicar registros', async () => {
    const rollback = new Error('ROLLBACK_VISITA_TESTE');
    const antes = await prisma.visitaCliente.count();
    await expect(
      prisma.$transaction(
        async (tx) => {
          const bancoTeste = {
            ...tx,
            $transaction: async (
              operacao:
                | ((t: Prisma.TransactionClient) => Promise<unknown>)
                | Promise<unknown>[],
            ) =>
              Array.isArray(operacao) ? Promise.all(operacao) : operacao(tx),
          } as unknown as PrismaService;
          const notificacoes = {
            notifyUsers: async () => ({ count: 0 }),
            getUserIdsByRoles: async () => [],
          } as unknown as NotificationsService;
          const config = new ConfigService();
          const sac = new AtendimentoSacService(
            bancoTeste,
            notificacoes,
            config,
          );
          const visitas = new VisitasService(bancoTeste, sac, config);
          async function usuario(role: UserRole) {
            const u = await tx.user.create({
              data: {
                name: role + ' Teste',
                email: randomUUID() + '@example.invalid',
                passwordHash: 'sem-login',
                role,
                roles: [role],
              },
            });
            return { sub: u.id, role, roles: [role] };
          }
          const lider = await usuario('LIDER_ATENDIMENTO'),
            ana = await usuario('ATENDIMENTO'),
            bia = await usuario('ATENDIMENTO');
          const clientesAntes = await tx.client.count();
          const cnpjLivre = '12.345.678/0001-90';
          const prevista = new Date(Date.now() + 86400000).toISOString();
          const realizada = new Date(Date.now() - 3600000).toISOString();
          const v = await visitas.criar(lider, {
            clienteNome: 'Cliente sem cadastro',
            cnpj: cnpjLivre,
            responsavelId: ana.sub,
            localVisita: 'Curitiba',
            tipoVisita: 'Relacionamento',
            dataPrevista: prevista,
            participantes: [{ nome: 'Nome enviado', usuarioId: ana.sub }],
          });
          expect(v.protocolo).toMatch(/^VIS-\d{6,}$/);
          expect(v.cnpj).toBe(cnpjLivre);
          expect(v.clienteNome).toBe('Cliente sem cadastro');
          expect(v.clienteId).toBeNull();
          expect(await tx.client.count()).toBe(clientesAntes);
          expect((await visitas.listar(ana, { cliente: 'sem cadastro' })).total).toBe(1);
          expect(v.participantes[0].nome).toBe('ATENDIMENTO Teste');
          expect((await visitas.listar(ana, {})).total).toBe(1);
          expect((await visitas.listar(bia, {})).total).toBe(0);
          await expect(visitas.detalhe(bia, v.id)).rejects.toBeInstanceOf(
            ForbiddenException,
          );
          await visitas.iniciar(ana, v.id);
          await visitas.reagendar(ana, v.id, {
            novaData: new Date(Date.now() + 172800000).toISOString(),
            motivo: 'Cliente pediu ajuste de data.',
          });
          await visitas.realizar(ana, v.id, {
            dataRealizada: realizada,
            relato: 'Primeira versão do relato.',
            pessoaAtendeu: 'Maria',
            teveCusto: true,
            custo: 12.5,
            insights: 'Insight anterior',
            emailPessoaAtendeu: 'antigo@example.invalid',
          });
          await expect(
            visitas.validar(ana, v.id, { decisao: 'APROVAR' }),
          ).rejects.toBeInstanceOf(ForbiddenException);
          await visitas.validar(lider, v.id, {
            decisao: 'AJUSTAR',
            observacao: 'Detalhar resultado da visita.',
          });
          await visitas.realizar(ana, v.id, {
            dataRealizada: realizada,
            relato: 'Segunda versão revisada.',
            pessoaAtendeu: 'Maria',
            teveCusto: false,
          });
          const revisada = await visitas.detalhe(ana, v.id);
          expect(revisada.realizacoes).toHaveLength(2);
          expect(revisada.insights).toBeNull();
          expect(revisada.emailPessoaAtendeu).toBeNull();
          expect((revisada.realizacoes[0].dados as any).insights).toBe(
            'Insight anterior',
          );
          expect(revisada.reagendamentos).toHaveLength(1);
          await visitas.validar(lider, v.id, { decisao: 'APROVAR' });
          await visitas.posVisita(ana, v.id, {
            novaDataAceita: true,
            atingiuObjetivo: false,
            sentimentoCliente: 'Cliente relatou dificuldade.',
            possuiMelhoria: true,
            melhoriaIdentificada: 'Melhorar atendimento',
            classificacao: 'REGULAR',
            gerarSac: true,
            tipoReclamacao: 'Qualidade',
            relatoSac: 'Problema identificado durante a visita.',
            estado: 'PR',
            cidade: 'Curitiba',
            email: 'maria@example.invalid',
            telefone: '41999999999',
          });
          const comSac = await visitas.detalhe(ana, v.id);
          expect(comSac.status).toBe('ATENDIMENTO_SAC');
          const atendimento = await sac.detalhe(ana, comSac.sacId!);
          expect(atendimento.visita?.id).toBe(v.id);
          expect(atendimento.protocolo).toMatch(/^SAC-\d{4}-\d{6,}$/);
          expect(atendimento.atendenteId).toBe(ana.sub);
          expect(atendimento.documento).toBe(cnpjLivre);
          expect(atendimento.email).toBe('maria@example.invalid');
          expect((await tx.ticket.findUniqueOrThrow({ where: { id: atendimento.ticketOrigemId } })).clientId).toBeNull();
          expect(
            (
              await tx.ticket.findUniqueOrThrow({
                where: { id: atendimento.ticketOrigemId },
              })
            ).origem,
          ).toBe('VISITA');
          await expect(visitas.concluir(ana, v.id)).rejects.toBeInstanceOf(
            ConflictException,
          );
          await expect(
            visitas.posVisita(ana, v.id, {
              atingiuObjetivo: true,
              sentimentoCliente: 'Reenvio',
              possuiMelhoria: false,
              classificacao: 'BOA',
              gerarSac: false,
            }),
          ).rejects.toBeInstanceOf(ConflictException);
          expect(
            await tx.atendimentoSac.count({
              where: { ticketOrigemId: atendimento.ticketOrigemId },
            }),
          ).toBe(1);
          const prazo = new Date(Date.now() + 86400000).toISOString();
          await sac.iniciar(ana, atendimento.id);
          await sac.classificar(ana, atendimento.id, {
            tipoReclamacao: 'Qualidade',
            motivo: 'Problema identificado.',
            area: 'Atendimento',
            responsavelAcaoId: ana.sub,
            prazo,
          });
          const plano = {
            oQue: 'Contatar cliente e resolver problema.',
            executor: 'Ana',
            prazo,
            dataExecucao: realizada,
            reporte: 'Problema resolvido com o cliente.',
          };
          await sac.plano(ana, atendimento.id, plano, false);
          await sac.plano(ana, atendimento.id, plano, true);
          await sac.registrarRnc(ana, atendimento.id, { gerou: false });
          await sac.avaliar(lider, atendimento.id, { aprovado: true });
          await visitas.concluir(ana, v.id);
          const concluida = await visitas.detalhe(ana, v.id);
          expect(concluida.status).toBe('CONCLUIDA');
          expect(concluida.concluidoEm).not.toBeNull();
          expect(
            concluida.historico.every(
              (h) =>
                h.usuarioId && h.criadoEm && h.statusAnterior && h.statusNovo,
            ),
          ).toBe(true);
          throw rollback;
        },
        { timeout: 30000 },
      ),
    ).rejects.toBe(rollback);
    expect(await prisma.visitaCliente.count()).toBe(antes);
  });
});
