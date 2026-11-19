import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BiComercialService } from './bi-comercial.service';
import { CadastrosService } from '../cadastros/cadastros.service';
import { EmpresasConsultorasService } from '../empresas-consultoras/empresas-consultoras.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const banco = process.env.BI_TESTAR_BANCO === '1' ? describe : describe.skip;
banco('Carteiras de empresas consultoras no banco local', () => {
  it('compartilha leitura e edição entre colegas, isola empresas, migra com prévia e revoga acesso na próxima autenticação', async () => {
    if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error('Teste permitido somente no banco local.');
    const prisma = new PrismaService(new ConfigService());
    const rollback = new Error('REVERTER_TESTE_EMPRESAS');
    try {
      await expect(prisma.$transaction(async tx => {
        // Valida a própria migration sem persistir DDL ou dados de teste.
        const [estado] = await tx.$queryRawUnsafe<Array<{ tabela: string | null }>>(`SELECT to_regclass('public."EmpresaConsultora"')::text AS tabela`);
        if (!estado.tabela) {
          const sql = readFileSync(resolve('prisma/migrations/20261118100000_empresas_consultoras/migration.sql'), 'utf8');
          for (const comando of sql.split(';').map(item => item.trim()).filter(Boolean)) await tx.$executeRawUnsafe(comando);
        }
        const [catalogo] = await tx.$queryRawUnsafe<Array<{ tabela: string | null }>>(`SELECT to_regclass('public."Segmento"')::text AS tabela`);
        if (!catalogo.tabela) for (const comando of readFileSync(resolve('prisma/migrations/20261118120000_segmentos_importacao_cadastros/migration.sql'), 'utf8').split(';').map(item => item.trim()).filter(Boolean)) await tx.$executeRawUnsafe(comando);
        const db = new Proxy(tx, { get: (target, prop) => prop === '$transaction' ? (fn: (value: typeof tx) => unknown) => fn(tx) : Reflect.get(target, prop) }) as unknown as PrismaService;
        const novoUsuario = (name: string, role: UserRole, empresaConsultoraId?: string) => tx.user.create({ data: { name, email: `${randomUUID()}@example.test`, passwordHash: 'teste-sem-login', role, roles: [role], empresaConsultoraId } });
        const gestor = await novoUsuario('Gestor teste', UserRole.ADMIN);
        const admin = { sub: gestor.id, email: gestor.email, role: UserRole.ADMIN };
        const empresas = new EmpresasConsultorasService(db);
        const empresaA = await empresas.criar(admin, { nome: 'Teste empresa A' });
        const empresaB = await empresas.criar(admin, { nome: 'Teste empresa B' });
        const a = await novoUsuario('Consultor A', UserRole.CONSULTORA, empresaA.id);
        const colega = await novoUsuario('Colega A', UserRole.CONSULTORA, empresaA.id);
        const b = await novoUsuario('Consultor B', UserRole.CONSULTORA, empresaB.id);
        for (const screenKey of ['commercialBi', 'cadastros', 'clients', 'leads', 'opportunities']) {
          await tx.roleScreenPermission.upsert({ where: { role_screenKey: { role: 'CONSULTORA', screenKey } }, create: { role: 'CONSULTORA', screenKey, isEnabled: true }, update: { isEnabled: true } });
        }
        const proprio = await tx.client.create({ data: { companyName: 'Teste próprio', responsavelId: a.id, empresaConsultoraId: empresaA.id } });
        const compartilhado = await tx.client.create({ data: { companyName: 'Teste colega', responsavelId: colega.id, empresaConsultoraId: empresaA.id } });
        // Mesmo responsável individual não concede acesso à outra empresa.
        const outro = await tx.client.create({ data: { companyName: 'Teste outra empresa', responsavelId: a.id, empresaConsultoraId: empresaB.id } });
        const semEmpresa = await tx.client.create({ data: { companyName: 'Teste legado', responsavelId: colega.id } });
        await tx.lead.create({ data: { name: 'Teste lead', cadastroId: compartilhado.id, createdById: colega.id, metadata: { responsible: colega.name, privado: 'não expor' } } });
        await tx.opportunity.create({ data: { clientId: compartilhado.id, title: 'Oportunidade colega' } });
        await tx.opportunity.create({ data: { clientId: outro.id, title: 'Oportunidade outra empresa' } });
        const strategy = new JwtStrategy(new ConfigService({ JWT_SECRET: 'test-only-secret' }), new UsersService(db, {} as AuditLogsService));
        const autenticar = (usuario: typeof a) => strategy.validate({ sub: usuario.id, email: usuario.email, role: usuario.role as never });
        const actor = await autenticar(a);
        const cadastros = new CadastrosService(db);
        const bi = new BiComercialService(db);
        expect((await cadastros.listar(actor)).map(item => item.id).sort()).toEqual([proprio.id, compartilhado.id].sort());
        expect((await cadastros.obter(actor, compartilhado.id)).id).toBe(compartilhado.id);
        await cadastros.atualizarEtapa(actor, compartilhado.id, { etapa: 'cotacao', proximaAcao: 'Edição pelo colega' });
        expect((await tx.lead.findUniqueOrThrow({ where: { cadastroId: compartilhado.id } })).metadata).toMatchObject({ nextAction: 'Edição pelo colega' });
        await expect(cadastros.obter(actor, outro.id)).rejects.toThrow('sua empresa');
        await expect(cadastros.atualizarEtapa(actor, outro.id, { etapa: 'perdido' })).rejects.toThrow('sua empresa');
        await expect(cadastros.obter(actor, semEmpresa.id)).rejects.toThrow('sua empresa');
        const resultado = await bi.consultar(actor);
        expect(resultado.cadastros.map(item => item.id).sort()).toEqual([proprio.id, compartilhado.id].sort());
        expect(resultado.oportunidades?.map(item => item.clientId)).toEqual([compartilhado.id]);
        expect(resultado.responsaveis.map(item => item.id).sort()).toEqual([a.id, colega.id].sort());
        expect(resultado.cadastros.find(item => item.id === compartilhado.id)?.leadCadastro?.metadata).not.toHaveProperty('privado');
        expect((await bi.consultar(actor, { responsavelId: colega.id })).cadastros.map(item => item.id)).toEqual([compartilhado.id]);
        await expect(bi.consultar(actor, { responsavelId: b.id })).rejects.toThrow('sua empresa');
        expect(await empresas.vincularCarteira(admin, empresaA.id, { cadastroIds: [semEmpresa.id] })).toMatchObject({ aplicado: false, quantidade: 1 });
        expect((await tx.client.findUniqueOrThrow({ where: { id: semEmpresa.id } })).empresaConsultoraId).toBeNull();
        await empresas.vincularCarteira(admin, empresaA.id, { cadastroIds: [semEmpresa.id], aplicar: true });
        expect((await tx.client.findUniqueOrThrow({ where: { id: semEmpresa.id } })).responsavelId).toBe(colega.id);
        expect(await tx.auditLog.count({ where: { targetId: semEmpresa.id } })).toBe(1);
        await empresas.vincularUsuario(admin, empresaB.id, colega.id, true);
        expect((await tx.client.findUniqueOrThrow({ where: { id: compartilhado.id } })).empresaConsultoraId).toBe(empresaA.id);
        await expect(cadastros.obter(await autenticar(colega), compartilhado.id)).rejects.toThrow('sua empresa');
        await empresas.atualizar(admin, empresaA.id, { ativa: false });
        await expect(cadastros.listar(await autenticar(a))).rejects.toThrow('empresa consultora ativa');
        throw rollback;
      }, { timeout: 45000 })).rejects.toBe(rollback);
    } finally { await prisma.$disconnect(); }
  }, 55000);
});
