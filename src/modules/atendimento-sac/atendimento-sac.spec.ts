import { ExecutionContext, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AtendimentoSacController } from './atendimento-sac.controller';
import { RelatosSiteController } from '../entradas/relatos-site.controller';
import { RelatosSiteService } from '../entradas/relatos-site.service';
import { EntradasService } from '../entradas/entradas.service';
import { TicketsService } from '../tickets/tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import 'dotenv/config';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole } from '@prisma/client';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AtendimentoSacService } from './atendimento-sac.service';
import { UsuarioSacGuard } from './usuario-sac.guard';

describe('Permissões do usuário SAC', () => {
  it('rejeita usuário inativo mesmo com JWT ainda válido', async () => {
    const guard = new UsuarioSacGuard({
      user: { findUnique: async () => ({ role: 'ADMIN', isActive: false }) },
    } as unknown as PrismaService);
    const req = { user: { sub: randomUUID(), role: 'ADMIN' } };
    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => req }),
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('revalida o perfil atual em vez de confiar em permissão antiga do JWT', async () => {
    const guard = new UsuarioSacGuard({
      user: {
        findUnique: async () => ({ role: 'ATENDIMENTO', isActive: true }),
      },
    } as unknown as PrismaService);
    const req = { user: { sub: randomUUID(), role: 'ADMIN' } };
    expect(
      await guard.canActivate({
        switchToHttp: () => ({ getRequest: () => req }),
      } as never),
    ).toBe(true);
    expect(req.user.role).toBe('ATENDIMENTO');
  });
});

const banco = process.env.SAC_TESTAR_BANCO === '1' ? describe : describe.skip;
banco('SAC com Prisma real — transação revertida ao finalizar', () => {
  let prisma: PrismaService;
  let diretorio: string;
  beforeAll(async () => {
    prisma = new PrismaService(new ConfigService());
    await prisma.onModuleInit();
    diretorio = await mkdtemp(join(tmpdir(), 'sac-teste-'));
  });
  afterAll(async () => {
    await prisma.onModuleDestroy();
    if (
      !resolve(diretorio).startsWith(resolve(tmpdir()) + '\\') &&
      !resolve(diretorio).startsWith(resolve(tmpdir()) + '/')
    )
      throw new Error('Diretório de teste inválido');
    await rm(diretorio, { recursive: true, force: true });
  });
  it('recebe, direciona, classifica, trata, devolve, registra RNC, conclui e reabre sem expor o relato aos responsáveis de ação', async () => {
    const rollback = new Error('ROLLBACK_TESTE_SAC');
    const notificacoes = {
      getUserIdsByRoles: jest.fn().mockResolvedValue([]),
      notifyUsers: jest.fn().mockResolvedValue({ count: 0 }),
    };
    const antes = await prisma.atendimentoSac.count();
    await expect(
      prisma.$transaction(
        async (tx) => {
          const bancoTeste = {
            ...tx,
            onModuleInit: async () => {},
            onModuleDestroy: async () => {},
            $transaction: async (
              operacao: (tx: Prisma.TransactionClient) => Promise<unknown>,
            ) => operacao(tx),
          } as unknown as PrismaService;
          const sac = new AtendimentoSacService(
            bancoTeste,
            notificacoes as unknown as NotificationsService,
            new ConfigService({ RELATOS_SITE_UPLOAD_DIR: diretorio }),
          );
          async function usuario(role: UserRole) {
            const u = await tx.user.create({
              data: {
                name: `Teste SAC ${role}`,
                email: `sac-${randomUUID()}@example.invalid`,
                passwordHash: 'teste-transacional-sem-login',
                role,
                mustChangePassword: true,
              },
            });
            return { sub: u.id, role: u.role };
          }
          const lider = await usuario('LIDER_ATENDIMENTO');
          const admin = await usuario('ADMIN');
          const gestao = await usuario('GESTAO');
          const atendente = await usuario('ATENDIMENTO');
          const outro = await usuario('ATENDIMENTO');
          const responsavel = await usuario('OPERACAO');
          const terceiros = await Promise.all(
            ['COMERCIAL', 'MARKETING', 'CLIENTE'].map((role) =>
              usuario(role as UserRole),
            ),
          );
          const anexoId = randomUUID();
          const arquivo = `${anexoId}.pdf`;
          await writeFile(join(diretorio, arquivo), '%PDF-1.4\n%%EOF');
          const relato = {
            canal: 'RECLAMACOES_ELOGIOS',
            tipoRegistro: 'RECLAMACAO',
            relato: 'Relato original que não pode ser sobrescrito.',
            estado: 'PR',
            empresa: 'Empresa exemplo',
            cidade: 'Curitiba',
            documento: 'NF 123',
            tipoReclamacao: 'Avaria',
            assinaturaRelato: 'assinatura-privada',
            identificadorRelato: randomUUID(),
            anexos: [
              {
                id: anexoId,
                arquivo,
                nome: 'evidencia.pdf',
                tipo: 'application/pdf',
                tamanho: 14,
                comentario: 'Embalagem recebida',
              },
            ],
          };
          const ticket = await tx.ticket.create({
            data: {
              subject: 'Registro de Reclamações e Elogios: teste',
              description: relato.relato,
              nomeSolicitante: 'Solicitante SAC',
              emailSolicitante: 'solicitante@example.invalid',
              telefoneSolicitante: '41999999999',
              origem: 'SITE',
              internalOnly: true,
              formPayload: relato,
            },
          });
          const recebido = await sac.receberTicket(ticket.id);
          expect(recebido.protocolo).toMatch(/^SAC-\d{4}-\d{6,}$/);
          expect(await sac.receberTicket(ticket.id)).toEqual(recebido);
          const registro = await tx.atendimentoSac.findUniqueOrThrow({
            where: { ticketOrigemId: ticket.id },
          });
          const id = registro.id;
          expect(registro.status).toBe('NOVO');
          expect(
            await tx.atendimentoSac.count({
              where: { ticketOrigemId: ticket.id },
            }),
          ).toBe(1);
          expect(
            (await sac.listar(lider, {})).itens.some((a) => a.id === id),
          ).toBe(true);
          for (const proibido of [responsavel, ...terceiros]) {
            await expect(sac.listar(proibido, {})).rejects.toBeInstanceOf(
              ForbiddenException,
            );
            await expect(sac.detalhe(proibido, id)).rejects.toBeInstanceOf(
              ForbiddenException,
            );
            await expect(
              sac.direcionar(proibido, id, { atendenteId: atendente.sub }),
            ).rejects.toBeInstanceOf(ForbiddenException);
          }
          await expect(sac.detalhe(atendente, id)).rejects.toBeInstanceOf(
            ForbiddenException,
          );
          await sac.direcionar(lider, id, {
            atendenteId: atendente.sub,
            observacao: 'Triagem do líder',
          });
          expect((await sac.detalhe(atendente, id)).status).toBe('ATRIBUIDO');
          await expect(sac.detalhe(outro, id)).rejects.toBeInstanceOf(
            ForbiddenException,
          );
          expect(
            (await sac.listar(outro, {})).itens.some((a) => a.id === id),
          ).toBe(false);
          await expect(
            sac.direcionar(atendente, id, { atendenteId: outro.sub }),
          ).rejects.toBeInstanceOf(ForbiddenException);
          await sac.direcionar(admin, id, { atendenteId: outro.sub });
          await sac.direcionar(gestao, id, { atendenteId: atendente.sub });
          const detalhe = await sac.detalhe(atendente, id);
          expect(JSON.stringify(detalhe)).not.toContain('assinatura-privada');
          expect(JSON.stringify(detalhe)).not.toContain(arquivo);
          expect(
            (await sac.baixar(atendente, id, anexoId)).conteudo.toString(),
          ).toContain('%PDF-');
          await expect(
            sac.baixar(responsavel, id, anexoId),
          ).rejects.toBeInstanceOf(ForbiddenException);
          await sac.iniciar(atendente, id);
          await expect(sac.iniciar(atendente, id)).rejects.toBeInstanceOf(
            ConflictException,
          );
          await sac.classificar(atendente, id, {
            tipoReclamacao: 'Avaria',
            documento: 'CT-e 321',
            motivo: 'Verificar embalagem avariada',
            area: 'Operações',
            responsavelAcaoId: responsavel.sub,
            prazo: new Date(Date.now() + 86400000).toISOString(),
            observacoesClassificacao: 'Conferir entrega',
          });
          expect((await sac.detalhe(atendente, id)).status).toBe(
            'AGUARDANDO_ACAO',
          );
          expect(
            (await sac.minhasAcoes(responsavel)).some(
              (t) => t.atendimento.id === id,
            ),
          ).toBe(true);
          const acao = await sac.minhaAcao(responsavel, id);
          expect(JSON.stringify(acao)).not.toMatch(
            /Solicitante SAC|solicitante@example|relatoOriginal|Embalagem recebida/,
          );
          await expect(sac.minhaAcao(terceiros[0], id)).rejects.toBeInstanceOf(
            ForbiddenException,
          );
          const plano = {
            oQue: 'Repor embalagem e verificar conteúdo',
            executor: 'Equipe operacional',
            prazo: new Date(Date.now() + 86400000).toISOString(),
            dataExecucao: new Date().toISOString(),
            reporte: 'Carga verificada e embalagem substituída.',
          };
          await expect(
            sac.plano(outro, id, plano, false),
          ).rejects.toBeInstanceOf(ForbiddenException);
          await sac.plano(responsavel, id, plano, false);
          expect((await sac.detalhe(atendente, id)).status).toBe(
            'EM_TRATATIVA',
          );
          await sac.anexar(
            responsavel,
            id,
            { etapa: 'ACAO_CORRETIVA', comentario: 'Evidência da reposição' },
            {
              originalname: 'reparo.pdf',
              mimetype: 'application/pdf',
              size: 14,
              buffer: Buffer.from('%PDF-1.4\n%%EOF'),
            } as Express.Multer.File,
          );
          await expect(
            sac.anexar(responsavel, id, { etapa: 'CLASSIFICACAO' }, {
              originalname: 'a.pdf',
              mimetype: 'application/pdf',
              size: 14,
              buffer: Buffer.from('%PDF-1.4\n%%EOF'),
            } as Express.Multer.File),
          ).rejects.toBeInstanceOf(ForbiddenException);
          await sac.plano(responsavel, id, plano, true);
          expect((await sac.detalhe(atendente, id)).status).toBe(
            'AGUARDANDO_AVALIACAO',
          );
          await expect(
            sac.plano(responsavel, id, plano, false),
          ).rejects.toBeInstanceOf(ForbiddenException);
          await expect(
            sac.avaliar(responsavel, id, { aprovado: true }),
          ).rejects.toBeInstanceOf(ForbiddenException);
          await expect(
            sac.avaliar(atendente, id, { aprovado: true }),
          ).rejects.toBeInstanceOf(BadRequestException);
          await sac.registrarRnc(atendente, id, { gerou: false });
          await expect(
            sac.avaliar(atendente, id, { aprovado: false }),
          ).rejects.toBeInstanceOf(BadRequestException);
          await sac.avaliar(atendente, id, {
            aprovado: false,
            motivo: 'Adicionar a confirmação final da conferência',
          });
          expect((await sac.detalhe(atendente, id)).status).toBe(
            'EM_TRATATIVA',
          );
          await sac.plano(
            responsavel,
            id,
            { ...plano, reporte: 'Conferência final documentada.' },
            true,
          );
          await expect(
            sac.registrarRnc(atendente, id, { gerou: true }),
          ).rejects.toBeInstanceOf(BadRequestException);
          await sac.registrarRnc(atendente, id, {
            gerou: true,
            numero: 'RNC-123',
            data: '2026-10-02',
            hora: '10:30',
            local: 'Curitiba',
            setor: 'Qualidade',
            motivo: 'Avaria',
            descricao: 'Ocorrência documentada e tratada.',
          });
          await sac.avaliar(atendente, id, { aprovado: true });
          const concluido = await sac.detalhe(atendente, id);
          expect(concluido.status).toBe('CONCLUIDO');
          expect(concluido.concluidoPorId).toBe(atendente.sub);
          expect(concluido.concluidoEm).not.toBeNull();
          await expect(
            sac.reabrir(atendente, id, { observacao: 'Novo detalhe' }),
          ).rejects.toBeInstanceOf(ForbiddenException);
          await sac.reabrir(lider, id, {
            observacao: 'Cliente informou um novo detalhe',
          });
          const final = await sac.detalhe(atendente, id);
          expect(final.status).toBe('REABERTO');
          expect(final.relatoOriginal.relato).toBe(relato.relato);
          expect(
            (await tx.ticket.findUniqueOrThrow({ where: { id: ticket.id } }))
              .formPayload,
          ).toEqual(relato);
          const eventos = final.historico;
          for (const tipo of [
            'RECEBIDO_SITE',
            'PROTOCOLO_CRIADO',
            'REATRIBUIDO',
            'ATENDIMENTO_INICIADO',
            'CLASSIFICACAO_REALIZADA',
            'ACAO_INICIADA',
            'ACAO_CONCLUIDA',
            'ANEXO_ADICIONADO',
            'RNC_REGISTRADA',
            'SOLUCAO_DEVOLVIDA',
            'SOLUCAO_APROVADA',
            'ATENDIMENTO_CONCLUIDO',
            'ATENDIMENTO_REABERTO',
          ])
            expect(eventos.some((e) => e.tipo === tipo)).toBe(true);
          expect(
            eventos
              .filter((e) => e.statusAnterior !== e.statusNovo)
              .map((e) => e.statusNovo),
          ).toEqual([
            'ATRIBUIDO',
            'EM_ATENDIMENTO',
            'CLASSIFICADO',
            'AGUARDANDO_ACAO',
            'EM_TRATATIVA',
            'AGUARDANDO_AVALIACAO',
            'EM_TRATATIVA',
            'AGUARDANDO_AVALIACAO',
            'CONCLUIDO',
            'REABERTO',
          ]);
          expect(
            final.tarefas.some(
              (t) =>
                t.tipo === 'ACAO_CORRETIVA' &&
                t.status === 'CONCLUIDA' &&
                t.concluidoEm,
            ),
          ).toBe(true);
          expect(
            final.tarefas.some(
              (t) => t.tipo === 'ATENDIMENTO' && t.status === 'PENDENTE',
            ),
          ).toBe(true);
          expect(notificacoes.notifyUsers).toHaveBeenCalled();
          // Exercita o adaptador multipart existente e os endpoints protegidos com os DTOs reais.
          const configHttp = new ConfigService({
            SITE_LEAD_INTEGRATION_TOKEN: 'segredo-apenas-servidor-teste',
            RELATOS_SITE_UPLOAD_DIR: diretorio,
          });
          const modulo = await Test.createTestingModule({
            controllers: [AtendimentoSacController, RelatosSiteController],
            providers: [
              UsuarioSacGuard,
              RelatosSiteService,
              { provide: PrismaService, useValue: bancoTeste },
              { provide: ConfigService, useValue: configHttp },
              { provide: AtendimentoSacService, useValue: sac },
              {
                provide: TicketsService,
                useValue: {
                  findOne: async () => {
                    throw new ForbiddenException();
                  },
                },
              },
              {
                provide: EntradasService,
                useValue: {
                  createFromSite: async (dados: {
                    nomeSolicitante: string;
                    emailSolicitante: string;
                    telefoneSolicitante: string;
                    mensagem: string;
                    formPayload: Prisma.InputJsonValue;
                  }) =>
                    tx.ticket.create({
                      data: {
                        subject:
                          'Registro de Reclamações e Elogios: teste HTTP',
                        description: dados.mensagem,
                        nomeSolicitante: dados.nomeSolicitante,
                        emailSolicitante: dados.emailSolicitante,
                        telefoneSolicitante: dados.telefoneSolicitante,
                        origem: 'SITE',
                        internalOnly: true,
                        formPayload: dados.formPayload,
                      },
                    }),
                },
              },
            ],
          })
            .overrideGuard(JwtAuthGuard)
            .useValue({
              canActivate: (context: ExecutionContext) => {
                const req = context.switchToHttp().getRequest<{
                  headers: { authorization?: string };
                  user?: { sub: string; role: string };
                }>();
                const sub = req.headers.authorization?.replace('Bearer ', '');
                if (!sub) return false;
                req.user = { sub, role: 'ADMIN' };
                return true;
              },
            })
            .compile();
          const appHttp = modulo.createNestApplication();
          appHttp.setGlobalPrefix('api');
          appHttp.useGlobalPipes(
            new ValidationPipe({
              whitelist: true,
              forbidNonWhitelisted: true,
              transform: true,
            }),
          );
          await appHttp.init();
          try {
            const origemHttp = {
              identificador: randomUUID(),
              nome: 'Solicitante HTTP',
              telefone: '41999999999',
              email: 'http@example.invalid',
              estado: 'PR',
              tipo: 'ELOGIO',
              relato: 'Elogio enviado pelo formulário do site.',
              empresa: 'Empresa HTTP',
              cidade: 'Curitiba',
              documento: 'CT-e HTTP',
              tipoReclamacao: 'Entrega',
            };
            const enviarHttp = () => {
              const envio = request(appHttp.getHttpServer())
                .post('/api/atendimentos/site/relatos')
                .set('x-integration-token', 'segredo-apenas-servidor-teste');
              Object.entries(origemHttp).forEach(([k, v]) => envio.field(k, v));
              return envio
                .field('comentariosAnexos', '["Comprovante de entrega"]')
                .attach('arquivos', Buffer.from('%PDF-1.4\n%%EOF'), {
                  filename: 'http.pdf',
                  contentType: 'application/pdf',
                });
            };
            const respostaHttp = await enviarHttp().expect(201);
            expect(Object.keys(respostaHttp.body).sort()).toEqual([
              'protocolo',
              'sucesso',
            ]);
            expect(respostaHttp.body.protocolo).toMatch(/^SAC-\d{4}-\d{6,}$/);
            expect((await enviarHttp().expect(201)).body).toEqual(
              respostaHttp.body,
            );
            await request(appHttp.getHttpServer())
              .post('/api/atendimentos/site/relatos')
              .field('nome', 'Sem token')
              .expect(403);
            const casoHttp = await tx.atendimentoSac.findUniqueOrThrow({
              where: { protocolo: respostaHttp.body.protocolo },
            });
            expect(casoHttp.empresa).toBe('Empresa HTTP');
            expect(casoHttp.cidade).toBe('Curitiba');
            const autenticar = (req: request.Test, u: { sub: string }) =>
              req.set('Authorization', `Bearer ${u.sub}`);
            await autenticar(
              request(appHttp.getHttpServer()).get(
                `/api/atendimento-sac/${casoHttp.id}`,
              ),
              responsavel,
            ).expect(403);
            await autenticar(
              request(appHttp.getHttpServer())
                .post(`/api/atendimento-sac/${casoHttp.id}/direcionar`)
                .send({ atendenteId: atendente.sub }),
              atendente,
            ).expect(403);
            await autenticar(
              request(appHttp.getHttpServer())
                .post(`/api/atendimento-sac/${casoHttp.id}/direcionar`)
                .send({ atendenteId: 'identificador-inválido' }),
              lider,
            ).expect(400);
            await autenticar(
              request(appHttp.getHttpServer())
                .post(`/api/atendimento-sac/${casoHttp.id}/direcionar`)
                .send({ atendenteId: atendente.sub }),
              lider,
            ).expect(201);
            const detalheHttp = (
              await autenticar(
                request(appHttp.getHttpServer()).get(
                  `/api/atendimento-sac/${casoHttp.id}`,
                ),
                atendente,
              ).expect(200)
            ).body;
            expect(detalheHttp.relatoOriginal.relato).toBe(origemHttp.relato);
            expect(detalheHttp.anexos[0].comentario).toBe(
              'Comprovante de entrega',
            );
            expect(JSON.stringify(detalheHttp)).not.toMatch(
              /assinaturaRelato|identificadorRelato|segredo-apenas|"arquivo":/,
            );
            await autenticar(
              request(appHttp.getHttpServer()).get(
                `/api/atendimento-sac/${casoHttp.id}/anexos/${detalheHttp.anexos[0].id}`,
              ),
              responsavel,
            ).expect(403);
            const downloadHttp = await autenticar(
              request(appHttp.getHttpServer()).get(
                `/api/atendimento-sac/${casoHttp.id}/anexos/${detalheHttp.anexos[0].id}`,
              ),
              atendente,
            ).expect(200);
            expect(downloadHttp.headers['cache-control']).toBe('no-store');
            expect(downloadHttp.headers['content-type']).toContain(
              'application/pdf',
            );
            await autenticar(
              request(appHttp.getHttpServer()).get(
                '/api/atendimento-sac?status=QUALQUER',
              ),
              lider,
            ).expect(400);
            await autenticar(
              request(appHttp.getHttpServer()).get(
                '/api/atendimento-sac?inicio=2026-10-03&fim=2026-10-01',
              ),
              lider,
            ).expect(400);
            await autenticar(
              request(appHttp.getHttpServer())
                .post(`/api/atendimento-sac/${id}/rnc`)
                .send({ gerou: 'false' }),
              atendente,
            ).expect(400);
            await sac.iniciar(atendente, casoHttp.id);
            const classificacaoHttp = {
              tipoReclamacao: 'Entrega',
              motivo: 'Conferir documento de entrega',
              area: 'Operações',
              responsavelAcaoId: responsavel.sub,
              prazo: new Date(Date.now() + 86400000).toISOString(),
            };
            await sac.classificar(atendente, casoHttp.id, classificacaoHttp);
            expect(
              (await sac.minhaAcao(responsavel, casoHttp.id)).protocolo,
            ).toBe(casoHttp.protocolo);
            await sac.classificar(atendente, casoHttp.id, {
              ...classificacaoHttp,
              responsavelAcaoId: terceiros[0].sub,
            });
            await expect(
              sac.minhaAcao(responsavel, casoHttp.id),
            ).rejects.toBeInstanceOf(ForbiddenException);
            expect(
              (await sac.minhaAcao(terceiros[0], casoHttp.id)).protocolo,
            ).toBe(casoHttp.protocolo);
          } finally {
            await appHttp.close();
          }

          throw rollback;
        },
        { timeout: 60000 },
      ),
    ).rejects.toBe(rollback);
    expect(await prisma.atendimentoSac.count()).toBe(antes);
  }, 90000);
});
