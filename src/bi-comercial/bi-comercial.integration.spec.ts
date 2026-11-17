import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BiComercialService } from './bi-comercial.service';
import { CadastrosService } from '../cadastros/cadastros.service';

const banco = process.env.BI_TESTAR_BANCO === '1' ? describe : describe.skip;
banco('BI Comercial no banco local', () => {
  it('isola consultoras, agrega oportunidades pelo cadastro e acompanha renomeação pelo ID', async () => {
    if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error('Teste permitido somente no banco local.');
    const prisma = new PrismaService(new ConfigService());
    const rollback = new Error('REVERTER_TESTE_BI');
    try {
      await expect(prisma.$transaction(async tx => {
        const a = await tx.user.create({ data: { name: 'BI Teste A', email: `${randomUUID()}@example.test`, passwordHash: 'teste-sem-login', role: 'CONSULTORA', roles: ['CONSULTORA'] } });
        const b = await tx.user.create({ data: { name: 'BI Teste A', email: `${randomUUID()}@example.test`, passwordHash: 'teste-sem-login', role: 'CONSULTORA', roles: ['CONSULTORA'] } });
        for (const screenKey of ['commercialBi', 'cadastros', 'clients', 'leads', 'opportunities']) {
          await tx.roleScreenPermission.upsert({ where: { role_screenKey: { role: 'CONSULTORA', screenKey } }, create: { role: 'CONSULTORA', screenKey, isEnabled: true }, update: { isEnabled: true } });
        }
        const proprio = await tx.client.create({ data: { companyName: 'BI cadastro A', responsavelId: a.id, internalOwnerId: b.id } });
        const outro = await tx.client.create({ data: { companyName: 'BI cadastro B', responsavelId: b.id, internalOwnerId: a.id } });
        await tx.client.create({ data: { companyName: 'BI sem vínculo', internalOwnerId: a.id } });
        await tx.lead.create({ data: { name: 'BI lead', cadastroId: proprio.id, createdById: b.id, metadata: { responsible: b.name, nextAction: 'Contato', privado: 'não expor' } } });
        await tx.opportunity.create({ data: { clientId: proprio.id, title: 'BI própria' } });
        await tx.opportunity.create({ data: { clientId: outro.id, title: 'BI outra' } });
        const service = new BiComercialService(tx as unknown as PrismaService);
        const actor = { sub: a.id, email: a.email, role: UserRole.CONSULTORA };
        const result = await service.consultar(actor);
        const cadastroService = new CadastrosService(tx as unknown as PrismaService);
        expect((await cadastroService.listar(actor)).map(item => item.id)).toEqual([proprio.id]);
        expect((await cadastroService.listar(actor, undefined, 'BI cadastro')).map(item => item.id)).toEqual([proprio.id]);
        expect((await cadastroService.obter(actor, proprio.id)).id).toBe(proprio.id);
        await expect(cadastroService.obter(actor, outro.id)).rejects.toThrow('outra pessoa');
        const gestao = { ...actor, role: UserRole.GESTAO };
        expect((await cadastroService.listar(gestao)).map(item => item.id)).toEqual(expect.arrayContaining([proprio.id, outro.id]));
        const semCadastro = await tx.lead.create({ data: { name: 'BI lead sem cadastro', createdById: a.id } });
        await expect(cadastroService.resolverLead(actor, semCadastro.id)).rejects.toThrow('responsabilidade');
        expect(await tx.client.count({ where: { sourceLeadId: semCadastro.id } })).toBe(0);
        expect(result.cadastros.map(item => item.id)).toEqual([proprio.id]);
        expect(result.oportunidades?.map(item => item.clientId)).toEqual([proprio.id]);
        expect(result.responsaveis.map(item => item.id)).toEqual([a.id]);
        expect(result.cadastros[0].leadCadastro?.metadata).not.toHaveProperty('privado');
        await expect(service.consultar(actor, { responsavelId: b.id })).rejects.toThrow('próprio BI');
        await tx.user.update({ where: { id: a.id }, data: { name: 'BI Nome atualizado' } });
        expect((await service.consultar(actor)).cadastros[0].responsavel).toBe('BI Nome atualizado');
        throw rollback;
      }, { timeout: 30000 })).rejects.toBe(rollback);
    } finally { await prisma.$disconnect(); }
  }, 40000);
});
