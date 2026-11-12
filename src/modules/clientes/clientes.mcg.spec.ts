import { ClientsService } from './clients.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '@prisma/client';

describe('Detalhes de cadastro com oportunidades de autores diferentes', () => {
  const user = {
    sub: 'consultora',
    email: 'c@test.local',
    role: UserRole.CONSULTORA,
  };
  function setup(responsible = 'MCG') {
    const client = {
      id: 'c1',
      leadCadastro: { metadata: { responsible } },
      quotes: [],
      contacts: [],
      opportunities: [
        { id: 'propria', status: 'OPEN', value: 10 },
        { id: 'comercial', status: 'OPEN', value: 100 },
        { id: 'sem-autoria', status: 'OPEN', value: 1000 },
      ],
      timelineEvents: [
        {
          id: 'e1',
          type: 'OPPORTUNITY_CREATED',
          createdById: user.sub,
          metadata: { opportunityId: 'propria' },
        },
        {
          id: 'e2',
          type: 'OPPORTUNITY_CREATED',
          createdById: 'comercial',
          metadata: { opportunityId: 'comercial' },
        },
        {
          id: 'e3',
          type: 'NOTE_ADDED',
          metadata: { opportunityId: 'comercial' },
        },
        { id: 'geral', type: 'NOTE_ADDED', metadata: null },
        {
          id: 'anexo-comercial',
          type: 'NOTE_ADDED',
          metadata: { documentId: 'doc-comercial', fileName: 'proposta.pdf' },
        },
      ],
      documents: [
        {
          id: 'doc-proprio',
          category: 'OPORTUNIDADE_PROPOSTA',
          uploadedById: user.sub,
        },
        {
          id: 'doc-comercial',
          category: 'OPORTUNIDADE_PROPOSTA',
          uploadedById: 'comercial',
        },
        { id: 'doc-cadastro', category: 'CADASTRO', uploadedById: 'comercial' },
      ],
    };
    const db = {
      client: { findUnique: jest.fn().mockResolvedValue(client) },
      clientDocument: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 'doc-comercial',
            category: 'OPORTUNIDADE_PROPOSTA',
            uploadedById: 'comercial',
            fileName: 'proposta.pdf',
          }),
      },
      $transaction: async (fn: (tx: unknown) => unknown) =>
        fn({
          client: { update: async () => client },
          lead: { findUnique: async () => null },
          timelineEvent: { create: async () => ({}) },
        }),
    };
    return new ClientsService(
      db as unknown as PrismaService,
      { create: jest.fn() } as unknown as AuditLogsService,
      { notifyUsers: jest.fn() } as unknown as NotificationsService,
      {} as UsersService,
    );
  }
  it('filtra oportunidades, indicadores, histórico e documentos comerciais nos detalhes', async () => {
    const service = setup();
    const detail = await service.getDetail(user, 'c1');
    expect(detail.opportunities.map((o) => o.id)).toEqual(['propria']);
    expect(detail.metrics).toMatchObject({
      totalOpportunities: 1,
      openValue: 10,
    });
    expect(detail.timeline.map((e) => e.id)).toEqual(['e1', 'geral']);
    expect(detail.client.documents.map((d) => d.id)).toEqual([
      'doc-proprio',
      'doc-cadastro',
    ]);
    const summary = await service.getSummary(user, 'c1');
    expect(summary.metrics).toMatchObject({
      totalOpportunities: 1,
      openValue: 10,
    });
    expect((await service.getTimeline(user, 'c1')).map((e) => e.id)).toEqual([
      'e1',
      'geral',
    ]);
    expect(
      (await service.findOne(user, 'c1')).opportunities.map((o) => o.id),
    ).toEqual(['propria']);
  });
  it('oculta até as oportunidades próprias se o cadastro deixou de ser MCG', async () => {
    expect((await setup('OUTRO').getDetail(user, 'c1')).opportunities).toEqual(
      [],
    );
  });
  it('bloqueia download direto de documento de oportunidade do Comercial', async () => {
    await expect(
      setup().getDocumentDownload(user, 'c1', 'doc-comercial'),
    ).rejects.toThrow('permissão');
  });
  it('não expõe oportunidades de outros autores na resposta de edição permitida do cadastro', async () => {
    const result = await setup().update(user, 'c1', {
      companyName: 'Novo nome',
    });
    expect(result.opportunities.map((o) => o.id)).toEqual(['propria']);
    expect(result.documents.map((d) => d.id)).toEqual([
      'doc-proprio',
      'doc-cadastro',
    ]);
  });
  it('preserva todas as oportunidades e indicadores para o Comercial', async () => {
    const detail = await setup().getDetail(
      { ...user, role: UserRole.COMERCIAL },
      'c1',
    );
    expect(detail.opportunities).toHaveLength(3);
    expect(detail.metrics).toMatchObject({
      totalOpportunities: 3,
      openValue: 1110,
    });
    expect(detail.client.documents).toHaveLength(3);
  });
});
