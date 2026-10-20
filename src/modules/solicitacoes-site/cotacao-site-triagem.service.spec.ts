import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SolicitacoesSiteService } from './solicitacoes-site.service';
import { garantirCadastroLead } from '../../common/cadastros';
jest.mock('../../common/cadastros', () => ({ garantirCadastroLead: jest.fn().mockResolvedValue({ id: 'cadastro' }) }));
import { CotacaoSiteTriagemService } from './cotacao-site-triagem.service';

const marketing = { sub: 'marketing', role: 'MARKETING', email: 'm@test.local' } as any;
const commercial = { sub: 'comercial', role: 'COMERCIAL', email: 'c@test.local' } as any;

describe('Triagem de cotação do site', () => {
  let service: CotacaoSiteTriagemService;
  let tx: any;
  let notifications: any;
  let request: any;
  let lead: any;
  beforeEach(() => {
    request = { id: 'request', tipo: 'COTACAO', status: 'NOVO', departamento: 'MARKETING', nome: 'Contato', empresa: 'Empresa', email: 'contato@test.local', solucao: 'Armazenagem', responsavelId: null };
    lead = { id: 'lead', cadastroId: 'cadastro', metadata: { solicitacaoSiteId: 'request', triagemSite: { etapa: 'LEAD' } }, timeline: [] };
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'request' }]),
      solicitacaoSite: {
        findUnique: jest.fn(async () => request),
        update: jest.fn(async ({ data }) => Object.assign(request, data)),
      },
      lead: {
        findFirst: jest.fn(async () => lead),
        update: jest.fn(async ({ data }) => Object.assign(lead, data)),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'comercial', name: 'Comercial', role: 'COMERCIAL', roles: ['COMERCIAL'], isActive: true }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      client: { update: jest.fn().mockResolvedValue({ id: 'cadastro' }) },
      opportunity: { create: jest.fn().mockResolvedValue({ id: 'opportunity' }) },
      leadTimelineEvent: { create: jest.fn().mockResolvedValue({}) },
      timelineEvent: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = { ...tx, $transaction: jest.fn(async (work) => work(tx)) };
    notifications = { notifyUsers: jest.fn().mockResolvedValue(undefined) };
    service = new CotacaoSiteTriagemService(prisma as any, notifications);
  });

  it('encaminha como oportunidade NOVO/OPEN, atribui o cadastro e notifica somente após a decisão', async () => {
    const result = await service.encaminhar(marketing, 'request', { responsavelId: 'comercial' });
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.opportunity.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ clientId: 'cadastro', stage: 'NOVO', status: 'OPEN' }) }));
    expect(tx.client.update).toHaveBeenCalledWith({ where: { id: 'cadastro' }, data: { internalOwnerId: 'comercial' } });
    expect(result.solicitacao.etapaCotacao).toBe('OPORTUNIDADE');
    expect(result.solicitacao.oportunidadeId).toBe('opportunity');
    expect(notifications.notifyUsers).toHaveBeenCalledWith(['comercial'], expect.objectContaining({ link: '/oportunidades/cadastro/cadastro' }), tx);
  });

  it('repetir encaminhamento devolve a mesma oportunidade sem criar ou notificar novamente', async () => {
    await service.encaminhar(marketing, 'request', { responsavelId: 'comercial' });
    await service.encaminhar(marketing, 'request', { responsavelId: 'comercial' });
    expect(tx.opportunity.create).toHaveBeenCalledTimes(1);
    expect(notifications.notifyUsers).toHaveBeenCalledTimes(1);
  });

  it('reprova com motivo e histórico, sem criar oportunidade nem avisar o Comercial', async () => {
    const result = await service.reprovar(marketing, 'request', { motivo: 'Fora da área de atuação' });
    expect(result.solicitacao.status).toBe('REPROVADO');
    expect(result.solicitacao.motivoReprovacao).toBe('Fora da área de atuação');
    expect(tx.leadTimelineEvent.create).toHaveBeenCalled();
    expect(tx.opportunity.create).not.toHaveBeenCalled();
    expect(notifications.notifyUsers).not.toHaveBeenCalled();
  });

  it('Comercial não pode decidir a triagem de Marketing', async () => {
    await expect(service.encaminhar(commercial, 'request', { responsavelId: 'comercial' })).rejects.toThrow(ForbiddenException);
    await expect(service.reprovar(commercial, 'request', { motivo: 'Teste' })).rejects.toThrow(ForbiddenException);
    expect(tx.opportunity.create).not.toHaveBeenCalled();
  });

  it('recusa responsável que não é Comercial ativo', async () => {
    tx.user.findUnique.mockResolvedValue({ id: 'outro', role: 'MARKETING', roles: ['MARKETING'], isActive: true });
    await expect(service.encaminhar(marketing, 'request', { responsavelId: 'outro' })).rejects.toThrow(BadRequestException);
    expect(tx.opportunity.create).not.toHaveBeenCalled();
  });

  it('exige motivo e impede encaminhar uma cotação reprovada', async () => {
    await expect(service.reprovar(marketing, 'request', { motivo: '  ' })).rejects.toThrow(BadRequestException);
    await service.reprovar(marketing, 'request', { motivo: 'Não atende ao perfil' });
    await expect(service.encaminhar(marketing, 'request', { responsavelId: 'comercial' })).rejects.toThrow(BadRequestException);
    expect(tx.opportunity.create).not.toHaveBeenCalled();
  });

  it('não reprova uma cotação que já foi encaminhada', async () => {
    await service.encaminhar(marketing, 'request', { responsavelId: 'comercial' });
    await expect(service.reprovar(marketing, 'request', { motivo: 'Teste' })).rejects.toThrow(BadRequestException);
  });
});


describe('Entrada pública de cotação', () => {
  it.each(['COTACAO', 'FORNECEDOR'])('registra %s sem gerar oportunidade ou notificar o Comercial na entrada', async (tipo) => {
    const tx: any = {
      solicitacaoSite: { create: jest.fn().mockResolvedValue({ id: 'request', tipo }) },
      lead: { create: jest.fn().mockResolvedValue({ id: 'lead', name: 'Contato' }) },
      opportunity: { create: jest.fn() },
    };
    const prisma: any = { $transaction: jest.fn(async work => work(tx)) };
    const notifications: any = { notifyRoles: jest.fn().mockResolvedValue(undefined) };
    const service = new SolicitacoesSiteService(prisma, notifications, {} as any);
    await service.criar({ tipo, nome: 'Contato', email: 'contato@test.local', empresa: 'Empresa', aceitePrivacidade: true });
    expect(tx.solicitacaoSite.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      tipo, departamento: tipo === 'COTACAO' ? 'MARKETING' : undefined,
    }) }));
    expect(tx.opportunity.create).not.toHaveBeenCalled();
    if (tipo === 'COTACAO') {
      expect(garantirCadastroLead).toHaveBeenCalled();
      expect(tx.lead.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
        status: 'entrada_leads', source: 'site', metadata: expect.objectContaining({ triagemSite: { etapa: 'LEAD' } }),
      }) }));
      expect(notifications.notifyRoles).toHaveBeenCalledWith(['MARKETING', 'ADMIN', 'GESTAO'], expect.objectContaining({ link: '/solicitacoes-site/request' }), tx);
    } else {
      expect(tx.lead.create).not.toHaveBeenCalled();
      expect(notifications.notifyRoles).not.toHaveBeenCalled();
    }
  });
});
