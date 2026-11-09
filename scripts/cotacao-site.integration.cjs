// Teste destrutivo somente em banco descartável criado por este script, no PostgreSQL temporário.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { Client, Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { NotificationsService } = require('../dist/src/modules/notifications/notifications.service');
const { SolicitacoesSiteService } = require('../dist/src/modules/solicitacoes-site/solicitacoes-site.service');
const { CotacaoSiteWorkflowService } = require('../dist/src/modules/solicitacoes-site/cotacao-site-workflow.service');
const { LeadsService } = require('../dist/src/modules/leads/leads.service');
const { ChatsService } = require('../dist/src/modules/chats/chats.service');
const { TicketsService } = require('../dist/src/modules/tickets/tickets.service');

async function main() {
  const dbName = `crm_site_test_${process.pid}`;
  const adminUrl = process.env.SITE_WORKFLOW_TEST_DATABASE_URL;
  if (!adminUrl) throw new Error('Informe SITE_WORKFLOW_TEST_DATABASE_URL do PostgreSQL temporário na porta 55439.');
  const parsed = new URL(adminUrl);
  if (parsed.hostname !== '127.0.0.1' || parsed.port !== '55439' || parsed.username !== 'crm_test') {
    throw new Error('O teste só aceita o PostgreSQL temporário em 127.0.0.1:55439, usuário crm_test.');
  }
  parsed.pathname = '/postgres';
  const admin = new Client({ connectionString: parsed.toString() });
  let pool, prisma, created = false;
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE "${dbName}"`);
    created = true;
    parsed.pathname = `/${dbName}`;
    pool = new Pool({ connectionString: parsed.toString(), max: 6 });
    const base = fs.readFileSync(path.join(os.tmpdir(), 'crm-cotacao-site-base-20261009/base.sql'), 'utf8');
    await pool.query(base);
    const ids = { admin: randomUUID(), marketing: randomUUID(), commercial: randomUUID(), other: randomUUID(),
      oldLead: randomUUID(), oldRequest: randomUUID(), oldProspect: randomUUID(), orphanRequest: randomUUID(),
      oldClient: randomUUID(), clientLead: randomUUID(), clientRequest: randomUUID(), aggregate: randomUUID() };
    for (const [id, name, role] of [[ids.admin, 'Admin', 'ADMIN'], [ids.marketing, 'Marketing', 'MARKETING'],
      [ids.commercial, 'Comercial', 'COMERCIAL'], [ids.other, 'Outro Comercial', 'COMERCIAL']]) {
      await pool.query(`INSERT INTO "User" (id,name,email,"passwordHash",role,"updatedAt") VALUES ($1,$2,$3,'TESTE', $4, NOW())`, [id,name,`${id}@test.local`,role]);
    }
    for (const [id, company] of [[ids.oldRequest,'Empresa original'], [ids.orphanRequest,'Empresa sem Lead'],
      [ids.clientRequest,'Empresa convertida'], [ids.aggregate,'Agregado']]) {
      await pool.query(`INSERT INTO "SolicitacaoSite" (id,tipo,nome,email,empresa,"responsavelId","atualizadoEm")
        VALUES ($1,$2,'Pessoa original','pessoa@test.local',$3,$4,NOW())`,
        [id, id === ids.aggregate ? 'AGREGADO' : 'COTACAO', company, id === ids.clientRequest ? 'usuario-orfaο' : null]);
    }
    await pool.query(`INSERT INTO "Prospect" (id,"nomeRazaoSocial",document,"updatedAt") VALUES ($1,'Prospect original','22345678000190',NOW())`, [ids.oldProspect]);
    await pool.query(`INSERT INTO "Client" (id,document,"companyName","internalOwnerId","updatedAt") VALUES ($1,'11.345.678/0001-90','Cliente original',$2,NOW())`, [ids.oldClient,ids.commercial]);
    await pool.query(`INSERT INTO "Lead" (id,name,company,status,source,metadata,"updatedById","updatedAt")
      VALUES ($1,'Pessoa original','Empresa original','conversao','site',$2::jsonb,$3,NOW())`,
      [ids.oldLead,JSON.stringify({ solicitacaoSiteId: ids.oldRequest, prospectId: ids.oldProspect }),ids.commercial]);
    await pool.query(`INSERT INTO "Lead" (id,name,company,status,source,metadata,"convertidoParaCliente","updatedAt")
      VALUES ($1,'Pessoa original','Empresa convertida','venda_efetivada','site',$2::jsonb,true,NOW())`,
      [ids.clientLead,JSON.stringify({ solicitacaoSiteId: ids.clientRequest, clientId: ids.oldClient })]);
    await pool.query(fs.readFileSync(path.join(__dirname,'../prisma/migrations/20261009120000_cotacao_site_workflow/migration.sql'),'utf8'));
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    const oldRequest = await prisma.solicitacaoSite.findUnique({ where: { id: ids.oldRequest }, include: { lead: true } });
    assert.equal(oldRequest.leadId,ids.oldLead); assert.equal(oldRequest.prospectId,ids.oldProspect);
    assert.equal(oldRequest.etapaCotacao,'PROSPECT'); assert.equal(oldRequest.responsavelId,ids.commercial);
    assert.equal(oldRequest.nome,'Pessoa original'); assert.equal(oldRequest.empresa,'Empresa original'); assert.equal(oldRequest.lead.status,'conversao');
    const orphan = await prisma.solicitacaoSite.findUnique({ where: { id: ids.orphanRequest }, include: { lead: true } });
    assert.equal(orphan.etapaCotacao,'LEAD'); assert.equal(orphan.lead.name,'Pessoa original'); assert.equal(orphan.lead.company,'Empresa sem Lead');
    const convertedOld = await prisma.solicitacaoSite.findUnique({ where: { id: ids.clientRequest } });
    assert.equal(convertedOld.clientId,ids.oldClient); assert.equal(convertedOld.etapaCotacao,'CLIENTE'); assert.equal(convertedOld.responsavelId,null);
    assert.equal((await prisma.solicitacaoSite.findUnique({ where: { id: ids.aggregate } })).etapaCotacao,null);
    assert.equal(await prisma.roleScreenPermission.count({ where: { screenKey: 'prospects', isEnabled: true } }),4);
    console.log('PASS migração: vínculos antigos, Lead faltante, nomes preservados, permissões e responsável órfão.');

    const notifications = new NotificationsService(prisma);
    const capture = new SolicitacoesSiteService(prisma,notifications);
    const workflow = new CotacaoSiteWorkflowService(prisma,notifications);
    const leads = new LeadsService(prisma,notifications);
    const chats = new ChatsService(prisma,{},notifications);
    const tickets = new TicketsService(prisma,{},notifications,chats);
    const marketing = { sub: ids.marketing, role: 'MARKETING', email: 'm@test.local' };
    const commercial = { sub: ids.commercial, role: 'COMERCIAL', email: 'c@test.local' };
    const other = { sub: ids.other, role: 'COMERCIAL', email: 'o@test.local' };
    const adminUser = { sub: ids.admin, role: 'ADMIN', email: 'a@test.local' };
    const captureResult = await capture.criar({ tipo:'COTACAO', nome:'Contato novo', email:'novo@test.local', empresa:'Nova Empresa', cnpj:'12.345.678/0001-90' });
    const id = captureResult.solicitacao.id;
    const leadId = captureResult.lead.id;
    assert.equal(captureResult.solicitacao.etapaCotacao,'LEAD'); assert.equal(captureResult.solicitacao.leadId,leadId);
    assert.equal(captureResult.lead.status,'site_lead');
    assert.ok((await capture.listar({},marketing)).solicitacoes.some(s => s.id === id));
    assert.ok(!(await capture.listar({},commercial)).solicitacoes.some(s => s.id === id));
    await assert.rejects(capture.buscarPorId(id,commercial),/não está atribuída/);
    await assert.rejects(leads.findOne(commercial,leadId),/não está atribuída/);
    await prisma.anexoSolicitacaoSite.create({ data: { solicitacaoId:id,nomeArquivo:'teste.pdf',nomeArquivoOriginal:'Proposta.pdf',url:'solicitacoes-site/teste.pdf' } });

    const assignment = await Promise.all([
      workflow.direcionar(marketing,id,{ responsavelId:ids.commercial }),
      workflow.direcionar(marketing,id,{ responsavelId:ids.commercial }),
    ]);
    assert.equal(assignment[0].solicitacao.prospectId,assignment[1].solicitacao.prospectId);
    assert.equal(assignment[0].solicitacao.anexos.length,1);
    assert.equal(await prisma.prospect.count({ where:{ document:'12345678000190' } }),1);
    assert.equal(await prisma.leadTimelineEvent.count({ where:{ leadId,title:'Lead direcionado ao Comercial como Prospect' } }),1);
    assert.equal(await prisma.notification.count({ where:{ userId:ids.commercial,title:'Novo Prospect atribuído' } }),1);
    await assert.rejects(workflow.atualizar({ ...other, roles:['MARKETING','COMERCIAL'] },id,{ empresa:'Não autorizado' }),/responsável/);
    await assert.rejects(capture.buscarAnexo(id,(await prisma.anexoSolicitacaoSite.findFirst({ where:{ solicitacaoId:id } })).id,other),/não está atribuída/);
    await assert.rejects(chats.create(other,{ entityType:'LEAD',entityId:leadId }),/não está atribuída/);
    await assert.rejects(tickets.create(other,{ leadId,subject:'Teste',description:'Não autorizado' }),/não está atribuída/);
    console.log('PASS atribuições simultâneas: um Prospect, um evento, um aviso, anexos conservados e acessos negados.');

    await workflow.atualizar(commercial,id,{ nome:'Contato qualificado',empresa:'Empresa qualificada',observacaoInterna:'Acompanhamento comercial' });
    const qualification = await capture.buscarPorId(id,commercial);
    assert.equal(qualification.solicitacao.nome,'Contato qualificado'); assert.equal(qualification.solicitacao.empresa,'Empresa qualificada');
    const clientsResult = await Promise.all([
      workflow.converterCliente(commercial,id,{ document:'12345678000190' }),
      workflow.converterCliente(commercial,id,{ document:'12.345.678/0001-90' }),
    ]);
    assert.equal(clientsResult[0].solicitacao.clientId,clientsResult[1].solicitacao.clientId);
    assert.equal(await prisma.client.count({ where:{ document:'12345678000190' } }),1);
    assert.equal(clientsResult[0].solicitacao.anexos.length,1);
    assert.equal(clientsResult[0].solicitacao.lead.timeline.filter(e=>e.title==='Prospect convertido em Cliente').length,1);
    assert.equal((await prisma.lead.findUnique({ where:{ id:leadId } })).status,'site_lead');
    assert.ok(!(await leads.findAll(adminUser,{})).some(l=>l.id===leadId));
    await assert.rejects(leads.updateStatus(adminUser,leadId,'venda_efetivada'),/qualificação/);
    assert.equal(await prisma.opportunity.count(),0); assert.equal(await prisma.quote.count(),0); assert.equal(await prisma.ticket.count(),0);
    assert.equal((await prisma.client.findUnique({ where:{ id:clientsResult[0].solicitacao.clientId } })).companyName,'Empresa qualificada');
    console.log('PASS conversões simultâneas: um Cliente e histórico completo, nomes separados e nenhum registro de funil.');

    const second = await capture.criar({ tipo:'COTACAO',nome:'Outro contato',email:'outro@test.local',empresa:'Empresa já cliente',cnpj:'11345678000190' });
    await workflow.direcionar(marketing,second.solicitacao.id,{ responsavelId:ids.commercial });
    const reused = await workflow.converterCliente(commercial,second.solicitacao.id,{ document:'11345678000190' });
    assert.equal(reused.solicitacao.clientId,ids.oldClient);
    assert.equal((await prisma.client.findUnique({ where:{ id:ids.oldClient } })).companyName,'Cliente original');
    console.log('PASS reutilização de Cliente com documento mascarado sem sobrescrever cadastro.');
  } finally {
    if (prisma) await prisma.$disconnect();
    if (pool) await pool.end();
    if (created) await admin.query(`DROP DATABASE "${dbName}" WITH (FORCE)`);
    await admin.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
