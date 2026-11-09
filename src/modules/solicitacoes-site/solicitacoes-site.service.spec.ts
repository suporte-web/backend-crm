import { SolicitacoesSiteService } from './solicitacoes-site.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

jest.mock('../../common/cadastros', () => ({ garantirCadastroLead: jest.fn().mockResolvedValue({ id: 'cadastro' }) }));

// Persistência e entrega são substituídas; o serviço de captura é real.
describe('captura de cotação do site', () => {
  function setup() {
    let request: Record<string, unknown> = {};
    let lead: Record<string, unknown> = {};
    let notifiedRoles: string[] = [];
    const tx = {
      solicitacaoSite: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          request = { id: 'solicitacao-1', ...data };
          return request;
        }),
        update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          request = { ...request, ...data };
          return request;
        }),
      },
      lead: { create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        lead = { id: 'lead-1', ...data };
        return lead;
      }) },
    };
    const prisma = { $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)) };
    const notifications = { notifyRoles: jest.fn(async (roles: string[]) => { notifiedRoles = roles; }) };
    const service = new SolicitacoesSiteService(prisma as unknown as PrismaService, notifications as unknown as NotificationsService, {} as any);
    return { service, state: () => ({ request, lead, notifiedRoles }) };
  }

  it('envia cotação para a triagem de Marketing como entrada no funil de Leads', async () => {
    const { service, state } = setup();
    await service.criar({ tipo: 'COTACAO', nome: 'Contato', email: 'contato@empresa.test', empresa: 'Empresa' });
    expect(state().request).toMatchObject({ tipo: 'COTACAO', departamento: 'MARKETING', etapaCotacao:'LEAD', leadId:'lead-1' });
    expect(state().lead).toMatchObject({ name: 'Contato', company: 'Empresa', status: 'entrada_leads' });
    expect(state().notifiedRoles).toEqual(expect.arrayContaining(['MARKETING', 'ADMIN', 'GESTAO']));
    expect(state().notifiedRoles).not.toContain('COMERCIAL');
  });

  it('mantém solicitações de outras áreas sem criar Lead ou classificação comercial', async () => {
    const { service, state } = setup();
    const result = await service.criar({ tipo: 'AGREGADO', nome: 'Agregado', email: 'a@test.com' });
    expect(result.lead).toBeNull();
    expect(state().request.etapaCotacao).toBeUndefined();
    expect(state().lead).toEqual({});
  });
});
