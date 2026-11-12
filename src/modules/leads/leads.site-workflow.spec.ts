import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatsService } from '../chats/chats.service';
import { TicketsService } from '../tickets/tickets.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ChatEntityType } from '@prisma/client';
import { LeadsService } from './leads.service';

const admin = { sub: 'admin', role: UserRole.ADMIN, email: 'a@test.com' };
const comercial = { sub: 'comercial', role: UserRole.COMERCIAL, email: 'c@test.com' };
describe('isolamento dos Leads do site', () => {
  const request = { id: 's1', tipo: 'COTACAO', etapaCotacao: 'LEAD', responsavelId: null };
  function setup() {
    const lead = { id: 'l1', name: 'Contato', company: 'Empresa', siteRequest: request };
    const prisma = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>): Promise<unknown> => fn(prisma)),
      solicitacaoSite: { findUnique: jest.fn(async () => request) },
      ticket: { findUnique: jest.fn(async () => ({ id: 't1', lead: { siteRequest: request }, leadId: 'l1', formPayload: null })) },
      lead: {
        findUnique: jest.fn(async () => lead),
        findMany: jest.fn(async ({ where }: { where: { siteRequest?: null } }) => where.siteRequest === null ? [] : [lead]),
        count: jest.fn(async ({ where }: { where: { siteRequest?: null } }) => where.siteRequest === null ? 0 : 1),
      },
    };
    const service = new LeadsService(prisma as unknown as PrismaService, {} as NotificationsService);
    return { service, prisma };
  }
  it('retira Leads vinculados às solicitações da lista e dos contadores do funil', async () => {
    const { service } = setup();
    expect(await service.findAll(admin, {})).toEqual([]);
    expect(await service.getResumo(admin)).toMatchObject({ ativos: 0, convertidos: 0, total: 0 });
  });
  it('impede Comercial de ler diretamente Lead ainda não direcionado', async () => {
    await expect(setup().service.findOne(comercial, 'l1')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('impede vincular estes Leads por novas conversas e chamados', async () => {
    const { prisma } = setup();
    const chats = new ChatsService(prisma as unknown as PrismaService, {} as AuditLogsService, {} as NotificationsService);
    const tickets = new TicketsService(prisma as unknown as PrismaService, {} as AuditLogsService, {} as NotificationsService, chats);
    await expect(tickets.create(comercial, { leadId: 'l1', subject: 'Assunto', description: 'Mensagem' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(chats.create(comercial, { entityType: ChatEntityType.LEAD, entityId: 'l1' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(chats.create(comercial, { entityType: ChatEntityType.TICKET, entityId: 't1' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(tickets.findOne(comercial, 't1')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('impede rotas antigas de mudar etapa, excluir ou converter Lead do site', async () => {
    const { service } = setup();
    await expect(service.updateStatus(admin, 'l1', 'venda_efetivada')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.update(admin, 'l1', { name: 'Alterado' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.excluir(admin, 'l1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.convertToClient(admin, 'l1', { document: '12345678000190' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.convertToProspect(admin, 'l1', {})).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('Observações do Lead em triagem',()=>{
 it('nega leitura e inclusão de observações pelo Comercial antes do direcionamento',async()=>{
  const prisma={lead:{findUnique:jest.fn(async()=>({id:'lead',source:'site',metadata:null,siteRequest:{tipo:'COTACAO',responsavelId:null,etapaCotacao:'LEAD'}}))}};
  const service=new LeadsService(prisma as unknown as PrismaService,{} as NotificationsService);
  await expect(service.listarObservacoes(comercial,'lead')).rejects.toBeInstanceOf(ForbiddenException);
  await expect(service.criarObservacao(comercial,'lead',{content:'Tentativa'})).rejects.toBeInstanceOf(ForbiddenException);
 });
});
