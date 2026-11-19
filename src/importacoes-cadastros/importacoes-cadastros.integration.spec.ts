import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Workbook } from 'exceljs';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ImportacoesCadastrosService } from './importacoes-cadastros.service';
import { CadastrosService } from '../cadastros/cadastros.service';
import { ClientsService } from '../clientes/clients.service';
import type { AuthUser } from '../auth/types/auth-user.type';

const banco = process.env.IMPORTACAO_TESTAR_BANCO === '1' ? describe : describe.skip;
banco('Importação com banco local e reversão integral', () => {
  it('valida prévia, isolamento, confirmação, idempotência e reversão de lote com erro', async () => {
    if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error('Teste permitido somente em banco local.');
    const prisma = new PrismaService(new ConfigService());
    const reverter = new Error('REVERTER_IMPORTACAO_TESTE');
    try {
      await expect(prisma.$transaction(async tx => {
        for (const [tabela, migration] of [
          ['EmpresaConsultora', '20261118100000_empresas_consultoras'],
          ['Segmento', '20261118120000_segmentos_importacao_cadastros'],
        ]) {
          const [estado] = await tx.$queryRawUnsafe<Array<{ nome: string | null }>>(`SELECT to_regclass('public."${tabela}"')::text AS nome`);
          if (!estado.nome) for (const sql of readFileSync(resolve('prisma/migrations', migration, 'migration.sql'), 'utf8').split(';').map(item => item.trim()).filter(Boolean)) await tx.$executeRawUnsafe(sql);
        }
        let contador = 0;
        const db = new Proxy(tx, { get(target, propriedade) {
          if (propriedade !== '$transaction') return Reflect.get(target, propriedade);
          return async (fn: (value: typeof tx) => unknown) => {
            const nome = `importacao_teste_${++contador}`;
            await tx.$executeRawUnsafe(`SAVEPOINT ${nome}`);
            try { const resultado = await fn(tx); await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${nome}`); return resultado; }
            catch (erro) { await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${nome}`); await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${nome}`); throw erro; }
          };
        } }) as unknown as PrismaService;
        const empresaA = await tx.empresaConsultora.create({ data: { nome: `Importação A ${randomUUID()}` } });
        const empresaB = await tx.empresaConsultora.create({ data: { nome: `Importação B ${randomUUID()}` } });
        const novoUsuario = (empresaId: string) => tx.user.create({ data: { name: 'Consultor teste', email: `${randomUUID()}@example.test`, passwordHash: 'teste-sem-login', role: 'CONSULTORA', roles: ['CONSULTORA'], empresaConsultoraId: empresaId } });
        const a = await novoUsuario(empresaA.id), colega = await novoUsuario(empresaA.id), b = await novoUsuario(empresaB.id);
        const actor: AuthUser = { sub: a.id, email: a.email, role: UserRole.CONSULTORA, empresaConsultoraId: empresaA.id, empresaConsultoraAtiva: true };
        for (const screenKey of ['cadastros', 'leads', 'clients']) await tx.roleScreenPermission.upsert({ where: { role_screenKey: { role: 'CONSULTORA', screenKey } }, create: { role: 'CONSULTORA', screenKey, isEnabled: true }, update: { isEnabled: true } });
        const prefixo = randomUUID(), colisao = `${randomUUID()}@example.test`;
        const oculto = await tx.client.create({ data: { companyName: `${prefixo} segredo`, empresaConsultoraId: empresaB.id, contacts: { create: { email: colisao } } } });
        const w = new Workbook(), aba = w.addWorksheet('CLIENTES');
        aba.addRow(['CLIENTE', 'FUNIL', 'CONTATO', 'EMAIL', 'SEGMENTOS', 'MCG', 'PZT', 'RETORNO CLIENTE', 'SITE / LINK']);
        aba.addRow([`${prefixo} primeiro`, 'LEAD', 'Contato', `${randomUUID()}@example.test`, 'IND. QUÍMICA', '01/02 - histórico', 'Nota PZT', 'Retorno', 'https://example.test']);
        aba.addRow([`${prefixo} segundo`, 'NUTRIÇÃO', '', `${randomUUID()}@example.test`, 'E-commerce']);
        aba.addRow([`${prefixo} conflito`, 'LEAD', '', colisao]);
        const file = { originalname: 'teste.xlsx', buffer: Buffer.from(await w.xlsx.writeBuffer()) };
        const service = new ImportacoesCadastrosService(db);
        const antes = await tx.client.count();
        const job = await service.preparar(actor, file, { responsavelId: colega.id, empresaConsultoraId: empresaA.id });
        expect(await tx.client.count()).toBe(antes);
        const previa = (job.linhas as any).linhas;
        expect(previa).toHaveLength(3);
        expect(previa[0].segmentoNome).toBe('Químico');
        expect(previa[1].etapaSugerida).toBeNull();
        expect(previa[2].selecionavel).toBe(false);
        expect(JSON.stringify(previa[2].duplicidades)).not.toContain(oculto.id);
        expect(JSON.stringify(previa[2].duplicidades)).not.toContain('segredo');
        await expect(service.preparar(actor, file, { responsavelId: b.id })).rejects.toThrow();
        await expect(service.obter({ ...actor, sub: colega.id }, job.id)).rejects.toThrow('não encontrada');
        await expect(service.confirmar(actor, job.id, { linhas: [{ numero: 4, etapa: 'entrada_leads', segmentoId: null }] })).rejects.toThrow('duplicidades');
        const invalido = randomUUID();
        await expect(service.confirmar(actor, job.id, { linhas: [
          { numero: 2, etapa: 'entrada_leads', segmentoId: previa[0].segmentoId },
          { numero: 3, etapa: 'conversao', segmentoId: invalido },
        ] })).rejects.toThrow('segmento ativo');
        expect(await tx.client.count()).toBe(antes); // a primeira linha do lote também foi revertida.
        const concluida = await service.confirmar(actor, job.id, { linhas: [{ numero: 2, etapa: 'entrada_leads', segmentoId: previa[0].segmentoId }] });
        expect(concluida.status).toBe('CONCLUIDA');
        expect(await tx.client.count()).toBe(antes + 1);
        await service.confirmar(actor, job.id, { linhas: [{ numero: 2, etapa: 'entrada_leads', segmentoId: previa[0].segmentoId }] });
        expect(await tx.client.count()).toBe(antes + 1);
        const criado = await tx.client.findFirstOrThrow({ where: { companyName: `${prefixo} primeiro` }, include: { leadCadastro: true } });
        expect(criado).toMatchObject({ modalidadeCadastro: 'LEAD', empresaConsultoraId: empresaA.id, responsavelId: colega.id, segmentoOrigem: 'IMPORTACAO', segment: 'Químico', userId: null });
        expect(criado.notes).toContain('01/02 - histórico');
        expect(criado.notes).toContain('Nota PZT');
        expect(criado.leadCadastro?.metadata).toMatchObject({ importacaoCadastro: { numero: 2 } });
        expect(await tx.auditLog.count({ where: { targetId: criado.id } })).toBe(1);
        const cadastros = new CadastrosService(db);
        await expect(cadastros.obter({ ...actor, sub: colega.id }, criado.id)).resolves.toBeDefined();
        await expect(cadastros.obter({ ...actor, sub: b.id, empresaConsultoraId: empresaB.id }, criado.id)).rejects.toThrow('sua empresa');
        const repetida = await service.preparar(actor, file, { responsavelId: colega.id });
        expect((repetida.linhas as any).linhas[0].selecionavel).toBe(false);
        const pendente = await service.preparar(actor, file, { responsavelId: colega.id });
        await tx.importacaoCadastro.update({ where: { id: pendente.id }, data: { expiresAt: new Date(0) } });
        await expect(service.confirmar(actor, pendente.id, { linhas: [{ numero: 3, etapa: 'conversao', segmentoId: null }] })).rejects.toThrow('expirou');
        const automatico = await cadastros.criar(actor, { modalidadeCadastro: 'LEAD', companyName: `${prefixo} CNAE`, cnae: '2063100', segmentoAutomatico: true });
        expect(automatico).toMatchObject({ segment: 'Cosméticos e higiene pessoal', segmentoOrigem: 'CNAE' });
        const clients = new ClientsService(db, { create: async () => ({}) } as never, { notifyUsers: async () => {} } as never, {} as never);
        const quimico = await tx.segmento.findUniqueOrThrow({ where: { codigo: 'quimico' } });
        await clients.update(actor, automatico.id, { segmentoId: quimico.id, segmentoAutomatico: false });
        await clients.update(actor, automatico.id, { cnae: '0113000' });
        expect(await tx.client.findUnique({ where: { id: automatico.id } })).toMatchObject({ segment: 'Químico', segmentoOrigem: 'MANUAL' });
        await clients.update(actor, automatico.id, { segmentoAutomatico: true });
        expect(await tx.client.findUnique({ where: { id: automatico.id } })).toMatchObject({ segment: 'Agropecuária', segmentoOrigem: 'CNAE' });
        throw reverter;
      }, { timeout: 60000, isolationLevel: 'Serializable' })).rejects.toBe(reverter);
    } finally { await prisma.$disconnect(); }
  }, 70000);
});
