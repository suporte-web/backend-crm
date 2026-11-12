import { UserRole } from '@prisma/client';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CotacaoSiteTriagemService } from './cotacao-site-triagem.service';
import { CotacaoSiteWorkflowService } from './cotacao-site-workflow.service';
import { siteRequestScope, assertSiteRequestAccess, siteWorkflowInclude } from './site-workflow-access';
import type { AuthUser } from '../auth/types/auth-user.type';

type Data = Record<string, unknown>;
const marketing: AuthUser = { sub: 'marketing', email: 'm@test.com', role: UserRole.MARKETING };
const comercial: AuthUser = { sub: 'comercial-1', email: 'c@test.com', role: UserRole.COMERCIAL };
const admin: AuthUser = { sub: 'admin', email: 'a@test.com', role: UserRole.ADMIN };

function setup(overrides: Data = {}) {
  let request: Data = { id: 's1', tipo: 'COTACAO', nome: 'Contato', empresa: 'Empresa', email: 'c@test.com',
    telefone: '11999999999', cnpj: '12.345.678/0001-90', cidade: 'Curitiba', etapaCotacao: 'LEAD',
    leadId: 'l1', prospectId: null, clientId: null, responsavelId: null, status: 'NOVO', ...overrides };
  let lead: Data = { id: 'l1', name: 'Contato', company: 'Empresa', status: 'site_lead', notes: null };
  const prospects: Data[] = [];
  const clients: Data[] = [];
  const history: Data[] = [];
  const clientHistory: Data[] = [];
  const notices: Data[] = [];
  const target = { id: 'comercial-1', name: 'Comercial', role: UserRole.COMERCIAL as UserRole, roles: [], isActive: true };
  const hydrate = () => ({ ...request, lead: request.leadId ? { ...lead, timeline: history } : null,
    prospect: prospects.find(p => p.id === request.prospectId) ?? null,
    client: clients.find(c => c.id === request.clientId) ?? null, responsavel: target });
  const inApp: Data[] = [];
  const opportunities: Data[] = [];
  const tx = {
    auditLog: {create:jest.fn(async()=>({}))},
    clientContact: { findFirst:jest.fn(async()=>null), update:jest.fn(async()=>({})), create:jest.fn(async({data}:{data:Data})=>({id:"contato",...data})) },
    $queryRaw: jest.fn(async () => [{id: request.id}]),
    opportunity: { create: jest.fn(async ({data}: {data:Data}) => { const row={id:"op-site",...data}; opportunities.push(row); return row; }), findUnique: jest.fn(async () => opportunities[0] ?? null) },
    notification: { createMany: jest.fn(async ({ data }: { data: Data[] }) => { inApp.push(...data); return { count: data.length }; }) },
    solicitacaoSite: {
      findUnique: jest.fn(async () => hydrate()),
      count: jest.fn(async () => 1),
      update: jest.fn(async ({ data }: { data: Data }) => { request = { ...request, ...data }; return hydrate(); }),
    },
    user: { findUnique: jest.fn(async () => target), findMany: jest.fn(async () => [target]) },
    lead: { findFirst: jest.fn(async () => ({...lead, timeline: history})), update: jest.fn(async ({ data }: { data: Data }) => { lead = { ...lead, ...data }; return lead; }) },
    prospect: {
      findFirst: jest.fn(async () => prospects[0] ?? null),
      create: jest.fn(async ({ data }: { data: Data }) => { const p = { id: 'p1', ...data }; prospects.push(p); return p; }),
      update: jest.fn(async ({ data }: { data: Data }) => { Object.assign(prospects[0], data); return prospects[0]; }),
    },
    client: {
      findUnique: jest.fn(async ({where}: {where:{id:string}}) => clients.find(c=>c.id===where.id) ?? null),
      update: jest.fn(async ({where,data}: {where:{id:string};data:Data}) => { const row=clients.find(c=>c.id===where.id) ?? {id:where.id}; Object.assign(row,data); return row; }),
      findFirst: jest.fn(async (): Promise<Data | null> => clients[0] ?? null),
      create: jest.fn(async ({ data }: { data: Data }) => { const c = { id: 'c1', ...data }; clients.push(c); return c; }),
    },
    leadTimelineEvent: { create: jest.fn(async ({ data }: { data: Data }) => { history.push(data); return data; }) },
    timelineEvent: { create: jest.fn(async ({ data }: { data: Data }) => { clientHistory.push(data); return data; }) },
  };
  const prisma = { ...tx, $transaction: jest.fn(async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx)) };
  const notifications = { notifyUsers: jest.fn(async (_ids: string[], input: Data) => { notices.push(input); }) };
  const service = new CotacaoSiteWorkflowService(prisma as unknown as PrismaService, notifications as unknown as NotificationsService);
  return { service, prisma, tx, opportunities, notifications, target, inApp, prospects, clients, history, clientHistory, notices, state: () => ({ request, lead }) };
}

describe('qualificação de cotações sem funil', () => {
  it('Marketing atribui um Prospect ao Comercial e registra autor, etapa e responsáveis', async () => {
    const test = setup();
    const result = await test.service.direcionar(marketing, 's1', { responsavelId: comercial.sub });
    expect(result.solicitacao).toMatchObject({ etapaCotacao: 'PROSPECT', prospectId: 'p1', responsavelId: comercial.sub });
    expect(test.prospects).toEqual([expect.objectContaining({ nomeRazaoSocial: 'Empresa', nomeContato: 'Contato', origem: 'SITE' })]);
    expect(test.state().lead.status).toBe('site_lead');
    expect(test.history[0]).toMatchObject({ createdById: marketing.sub, metadata: expect.objectContaining({ de: 'LEAD', para: 'PROSPECT', responsavelAnteriorId: null, responsavelId: comercial.sub }) });
  });
  it('repetir o direcionamento não duplica Prospect nem histórico', async () => {
    const test = setup();
    await test.service.direcionar(marketing, 's1', { responsavelId: comercial.sub });
    await test.service.direcionar(marketing, 's1', { responsavelId: comercial.sub });
    expect(test.prospects).toHaveLength(1);
    expect(test.history).toHaveLength(1);
    expect(test.notices).toHaveLength(1);
  });
  it('reutiliza Prospect da mesma empresa por documento sem alterar seus dados', async () => {
    const test = setup();
    test.prospects.push({ id: 'existente', document: '12345678000190', nomeRazaoSocial: 'Razão social cadastrada' });
    await test.service.direcionar(marketing, 's1', { responsavelId: comercial.sub });
    expect(test.prospects).toHaveLength(1);
    expect(test.state().request.prospectId).toBe('existente');
    expect(test.prospects[0].nomeRazaoSocial).toBe('Razão social cadastrada');
  });
  it('perfil combinado Marketing/Comercial não altera Prospect de outro responsável', async () => {
    const test = setup({ etapaCotacao: 'PROSPECT', prospectId: 'p1', responsavelId: 'outro' });
    const mixed = { ...comercial, roles: [UserRole.MARKETING, UserRole.COMERCIAL] };
    await expect(test.service.atualizar(mixed, 's1', { nome: 'Alterado' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(test.service.converterCliente(mixed, 's1', { document: '12345678000190' })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('avisa atribuição no CRM sem enviar webhook durante uma transação sujeita a retry', async () => {
    const test = setup();
    const previousUrl = process.env.EMAIL_WEBHOOK_URL;
    process.env.EMAIL_WEBHOOK_URL = 'https://notification.example.test';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 200 }));
    try {
      const realNotifications = new NotificationsService(test.prisma as unknown as PrismaService);
      const service = new CotacaoSiteWorkflowService(test.prisma as unknown as PrismaService, realNotifications);
      await service.direcionar(marketing, 's1', { responsavelId: comercial.sub });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(test.inApp).toEqual([expect.objectContaining({ userId: comercial.sub, title: 'Novo Prospect atribuído' })]);
    } finally {
      fetchSpy.mockRestore();
      if (previousUrl === undefined) delete process.env.EMAIL_WEBHOOK_URL;
      else process.env.EMAIL_WEBHOOK_URL = previousUrl;
    }
  });
  it('respostas de ações mantêm a inclusão dos documentos originais do site', () => {
    expect(siteWorkflowInclude).toHaveProperty('anexos');
  });
  it('rejeita direcionamento pelo Comercial, destino inativo ou não Comercial', async () => {
    const test = setup();
    await expect(test.service.direcionar(comercial, 's1', { responsavelId: comercial.sub })).rejects.toBeInstanceOf(ForbiddenException);
    test.target.isActive = false;
    await expect(test.service.direcionar(marketing, 's1', { responsavelId: comercial.sub })).rejects.toBeInstanceOf(BadRequestException);
    test.target.isActive = true; test.target.role = UserRole.MARKETING;
    await expect(test.service.direcionar(marketing, 's1', { responsavelId: comercial.sub })).rejects.toBeInstanceOf(BadRequestException);
    expect(test.prospects).toHaveLength(0);
  });
  it('Comercial atualiza contato e empresa separadamente e registra alterações', async () => {
    const test = setup();
    await test.service.direcionar(marketing, 's1', { responsavelId: comercial.sub });
    await test.service.atualizar(comercial, 's1', { nome: 'Novo contato', empresa: 'Empresa corrigida', observacaoInterna: 'Retornar na sexta' });
    expect(test.state().request).toMatchObject({ nome: 'Novo contato', empresa: 'Empresa corrigida', observacaoInterna: 'Retornar na sexta' });
    expect(test.state().lead).toMatchObject({ name: 'Novo contato', company: 'Empresa corrigida', status: 'site_lead' });
    expect(test.prospects[0]).toMatchObject({ nomeContato: 'Novo contato', nomeRazaoSocial: 'Empresa corrigida' });
    expect(test.history[test.history.length - 1]).toMatchObject({ createdById: comercial.sub, metadata: expect.objectContaining({ alteracoes: expect.objectContaining({ empresa: { de: 'Empresa', para: 'Empresa corrigida' } }) }) });
  });
  it('Comercial não atualiza ou converte Prospect de outro responsável', async () => {
    const test = setup({ etapaCotacao: 'PROSPECT', prospectId: 'p1', responsavelId: 'outro' });
    await expect(test.service.atualizar(comercial, 's1', { empresa: 'Alterada' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(test.service.converterCliente(comercial, 's1', { document: '12345678000190' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(test.clients).toHaveLength(0); expect(test.history).toHaveLength(0);
  });
  it('não permite pular triagem nem converter sem documento', async () => {
    const test = setup();
    await expect(test.service.converterCliente(admin, 's1', { document: '12345678000190' })).rejects.toBeInstanceOf(BadRequestException);
    await test.service.direcionar(marketing, 's1', { responsavelId: comercial.sub });
    await expect(test.service.converterCliente(comercial, 's1', { document: ' ' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(test.service.converterCliente(marketing, 's1', { document: '12345678000190' })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('converte e repete a conversão sem duplicar Cliente ou eventos e conserva o Prospect', async () => {
    const test = setup();
    await test.service.direcionar(marketing, 's1', { responsavelId: comercial.sub });
    await test.service.converterCliente(comercial, 's1', { document: '12.345.678/0001-90' });
    await test.service.converterCliente(comercial, 's1', { document: '12345678000190' });
    expect(test.clients).toHaveLength(1);
    expect(test.clients[0]).toMatchObject({ document: '12345678000190', internalOwnerId: comercial.sub, companyName: 'Empresa' });
    expect(test.state().request).toMatchObject({ etapaCotacao: 'CLIENTE', prospectId: 'p1', clientId: 'c1', status: 'CONCLUIDO' });
    expect(test.state().lead).toMatchObject({ convertidoParaCliente: true, status: 'site_lead' });
    expect(test.history).toHaveLength(2); expect(test.clientHistory).toHaveLength(1);
    expect(test.clients[0]).not.toHaveProperty('opportunities');
    expect(test.prospects).toHaveLength(1);
  });
  it('vincula Cliente já cadastrado sem sobrescrever cadastro ou criar outro', async () => {
    const test = setup();
    test.clients.push({ id: 'cliente-existente', document: '12.345.678/0001-90', companyName: 'Cadastro original' });
    await test.service.direcionar(marketing, 's1', { responsavelId: comercial.sub });
    await test.service.converterCliente(comercial, 's1', { document: '12345678000190' });
    expect(test.clients).toHaveLength(1); expect(test.clients[0].companyName).toBe('Cadastro original');
    expect(test.state().request.clientId).toBe('cliente-existente');
  });
  it('Marketing reassume/redistribui sem recriar Prospect e mantém responsáveis no histórico', async () => {
    const test = setup();
    await test.service.direcionar(marketing, 's1', { responsavelId: comercial.sub });
    test.target.id = 'comercial-2';
    await test.service.direcionar(marketing, 's1', { responsavelId: 'comercial-2' });
    expect(test.prospects).toHaveLength(1);
    expect(test.history[test.history.length - 1]).toMatchObject({ metadata: expect.objectContaining({ responsavelAnteriorId: 'comercial-1', responsavelId: 'comercial-2' }) });
  });
  it('repete transação após conflito de serialização', async () => {
    const test = setup();
    test.prisma.$transaction.mockRejectedValueOnce({ code: 'P2034' });
    await test.service.direcionar(marketing, 's1', { responsavelId: comercial.sub });
    expect(test.state().request.etapaCotacao).toBe('PROSPECT');
    expect(test.prospects).toHaveLength(1);
  });
  it('recusa transições de solicitação sem cotação', async () => {
    const test = setup({ tipo: 'AGREGADO' });
    await expect(test.service.direcionar(marketing, 's1', { responsavelId: comercial.sub })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('acesso à captura e anexos', () => {
  it('restringe leitura do Comercial às suas cotações encaminhadas', () => {
    expect(siteRequestScope(comercial)).toMatchObject({ tipo: 'COTACAO', responsavelId: comercial.sub, OR: expect.any(Array) });
    expect(() => assertSiteRequestAccess(comercial, { tipo: 'COTACAO', responsavelId: null, etapaCotacao: 'LEAD' })).toThrow(ForbiddenException);
    expect(() => assertSiteRequestAccess(comercial, { tipo: 'COTACAO', responsavelId: 'outro', etapaCotacao: 'PROSPECT' })).toThrow(ForbiddenException);
    expect(() => assertSiteRequestAccess(comercial, { tipo: 'COTACAO', responsavelId: comercial.sub, etapaCotacao: 'PROSPECT' })).not.toThrow();
  });
  it('Marketing e Gestão têm visão global, inclusive perfil composto', () => {
    expect(siteRequestScope(marketing)).toEqual({});
    expect(siteRequestScope({ ...comercial, roles: [UserRole.GESTAO, UserRole.COMERCIAL] })).toEqual({});
  });
  it('recusa perfis externos e operacionais', () => {
    expect(() => siteRequestScope({ ...comercial, role: UserRole.CLIENTE })).toThrow(ForbiddenException);
    expect(() => siteRequestScope({ ...comercial, role: UserRole.OPERACAO })).toThrow(ForbiddenException);
  });
});

describe('Compatibilidade do workflow com o cadastro unificado', () => {
  it('promove cadastro LEAD existente sem duplicar Client e mantém a proveniência', async () => {
    const test = setup();
    test.clients.push({id:'cadastro-lead',document:'12345678000190',modalidadeCadastro:'LEAD',companyName:'Nome original'});
    await test.service.direcionar(marketing,'s1',{responsavelId:comercial.sub});
    await test.service.converterCliente(comercial,'s1',{document:'12345678000190'});
    expect(test.clients).toHaveLength(1);
    expect(test.clients[0]).toMatchObject({modalidadeCadastro:'CLIENTE',sourceLeadId:'l1',sourceProspectId:'p1',companyName:'Nome original'});
    expect(test.tx.client.create).not.toHaveBeenCalled();
    expect(test.state().lead).toMatchObject({convertedProspectId:'p1',convertidoParaCliente:true});
  });
  it('recupera vínculo legado por metadata sem criar outro Lead', async () => {
    const test=setup({leadId:null,etapaCotacao:null});
    await test.service.direcionar(marketing,'s1',{responsavelId:comercial.sub});
    expect(test.state().request).toMatchObject({leadId:'l1',prospectId:'p1',etapaCotacao:'PROSPECT'});
    expect(test.tx.lead.findFirst).toHaveBeenCalled();
  });
});

describe('Cadastro sem documento e autorização legada', () => {
 it('converte o cadastro LEAD vinculado mesmo quando seu documento ainda está vazio', async()=>{
  const test=setup();
  const leadId=test.state().lead.id;
  test.tx.lead.findFirst.mockResolvedValueOnce({...test.state().lead,timeline:[]});
  await test.tx.lead.update({data:{cadastroId:'cadastro-vinculado'}});
  test.clients.push({id:'cadastro-vinculado',document:null,modalidadeCadastro:'LEAD',companyName:'Cadastro existente'});
  test.tx.client.findFirst.mockResolvedValueOnce(null);
  await test.service.direcionar(marketing,'s1',{responsavelId:comercial.sub});
  await test.service.atualizar(comercial,'s1',{empresa:'Empresa qualificada',nome:'Contato corrigido',telefone:'41999990000',email:'novo@example.test',cidade:'Curitiba',observacaoInterna:'Qualificada'});
  await test.service.converterCliente(comercial,'s1',{document:'12345678000190'});
  expect(test.clients[0]).toMatchObject({companyName:'Empresa qualificada',phone:'41999990000',city:'Curitiba',notes:'Qualificada'});
  expect(test.tx.clientContact.create).toHaveBeenCalledWith({data:expect.objectContaining({name:'Contato corrigido',email:'novo@example.test',clientId:'cadastro-vinculado'})});
  expect(test.tx.client.create).not.toHaveBeenCalled();
  expect(test.clients[0]).toMatchObject({document:'12345678000190',modalidadeCadastro:'CLIENTE',sourceLeadId:leadId});
  expect(test.state().lead.cadastroId).toBe('cadastro-vinculado');
 });
});

describe('Fluxo integrado de triagem e conversão',()=>{
 it('mantém a oportunidade no mesmo cadastro ao converter Prospect em Cliente',async()=>{
  const test=setup();
  test.clients.push({id:'cadastro',document:null,modalidadeCadastro:'LEAD',companyName:'Empresa'});
  await test.tx.lead.update({data:{cadastroId:'cadastro'}});
  const triagem=new CotacaoSiteTriagemService(test.prisma as unknown as PrismaService,test.notifications as unknown as NotificationsService,test.service);
  const result=await triagem.encaminhar(marketing,'s1',{responsavelId:comercial.sub});
  expect(result.solicitacao).toMatchObject({etapaCotacao:'PROSPECT',prospectId:'p1',oportunidadeId:'op-site',cadastroId:'cadastro'});
  await triagem.encaminhar(marketing,'s1',{responsavelId:comercial.sub});
  expect(test.opportunities).toHaveLength(1);expect(test.notices).toHaveLength(1);
  test.tx.client.findFirst.mockResolvedValueOnce(null);
  await test.service.converterCliente(comercial,'s1',{document:'12345678000190'});
  expect(test.clients).toHaveLength(1);expect(test.clients[0]).toMatchObject({id:'cadastro',modalidadeCadastro:'CLIENTE'});
  expect(test.opportunities[0].clientId).toBe(test.state().request.clientId);
 });
 it('limpa campos opcionais nulos sem erro de trim e mantém autor da alteração',async()=>{
  const test=setup();await test.service.direcionar(marketing,'s1',{responsavelId:comercial.sub});
  const payload: import('./dto/cotacao-site-actions.dto').AtualizarCotacaoSiteDto={};
  Object.defineProperty(payload,'telefone',{value:null,enumerable:true});
  await test.service.atualizar(comercial,'s1',payload);
  expect(test.state().request.telefone).toBeNull();
  expect(test.history[test.history.length-1].createdById).toBe(comercial.sub);
 });
});
