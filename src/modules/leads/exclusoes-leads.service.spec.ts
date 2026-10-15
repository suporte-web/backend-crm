import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ExclusoesLeadsService } from './exclusoes-leads.service';
import { LeadsService } from './leads.service';
import { NotificationsService } from '../notifications/notifications.service';

const consultora: AuthUser = {
  sub: 'autora',
  email: 'c@crm.test',
  role: UserRole.CONSULTORA,
};
const comercial: AuthUser = {
  sub: 'gestor',
  email: 'g@crm.test',
  role: UserRole.COMERCIAL,
};
const lead = {
  id: 'l1',
  name: 'Lead',
  company: 'Empresa',
  email: 'lead@crm.test',
  createdById: 'autora',
  convertidoParaCliente: false,
  convertedProspectId: null,
  convertedClients: [],
  originatedProspects: [],
  timeline: [{ description: 'Contato inicial' }],
  observations: [{ content: 'Solicitou proposta' }],
  chats: [],
  anexos: [],
};
const pending = {
  id: 'r1',
  leadId: 'l1',
  requestedById: 'autora',
  status: 'PENDENTE',
  reason: 'Duplicado',
};

describe('Solicitações próprias de exclusão de Leads', () => {
  const delegate = () => ({
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    delete: jest.fn(),
  });
  let prisma: Record<
    | 'lead'
    | 'leadDeletionRequest'
    | 'auditLog'
    | 'leadTimelineEvent'
    | 'ticket'
    | 'chat'
    | 'leadImportRowResult',
    ReturnType<typeof delegate>
  > & { $transaction: jest.Mock };
  let service: ExclusoesLeadsService;
  beforeEach(async () => {
    prisma = {
      lead: delegate(),
      leadDeletionRequest: delegate(),
      auditLog: delegate(),
      leadTimelineEvent: delegate(),
      ticket: delegate(),
      chat: delegate(),
      leadImportRowResult: delegate(),
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.lead.findFirst.mockResolvedValue(lead);
    prisma.lead.findUnique.mockResolvedValue(lead);
    prisma.leadDeletionRequest.create.mockResolvedValue(pending);
    prisma.leadDeletionRequest.findUnique.mockResolvedValue(pending);
    const module = await Test.createTestingModule({
      providers: [
        ExclusoesLeadsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ExclusoesLeadsService);
  });
  it('Consulta a autoria no banco usando o ID autenticado e registra o histórico', async () => {
    await service.solicitar(consultora, 'l1', { reason: 'Duplicado' });
    expect(prisma.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'l1', createdById: consultora.sub },
      }),
    );
    expect(prisma.leadDeletionRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestedById: 'autora',
        leadId: 'l1',
        leadNameSnapshot: 'Empresa',
      }),
    });
    expect(prisma.leadTimelineEvent.create).toHaveBeenCalled();
  });
  it('não revela nem solicita exclusão de lead de outra pessoa', async () => {
    prisma.lead.findFirst.mockResolvedValue(null);
    await expect(
      service.solicitar(consultora, 'de-outro', { reason: 'Duplicado' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.leadDeletionRequest.create).not.toHaveBeenCalled();
  });
  it('reutiliza solicitação pendente sem duplicar registros ou histórico', async () => {
    prisma.leadDeletionRequest.findFirst.mockResolvedValue(pending);
    expect(
      await service.solicitar(consultora, 'l1', { reason: 'Outro motivo' }),
    ).toEqual(pending);
    expect(prisma.leadDeletionRequest.create).not.toHaveBeenCalled();
    expect(prisma.leadTimelineEvent.create).not.toHaveBeenCalled();
  });
  it.each([UserRole.CONSULTORA, UserRole.MARKETING, UserRole.CLIENTE])(
    'nega listagem e decisão a %s antes do banco',
    async (role) => {
      const user = { ...comercial, role };
      await expect(service.listar(user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.decidir(user, 'r1', { action: 'APPROVE' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );
  it('respeita múltiplos perfis no AuthUser', async () => {
    await expect(
      service.listar({
        ...comercial,
        role: UserRole.MARKETING,
        roles: [UserRole.MARKETING, UserRole.GESTAO],
      }),
    ).resolves.toEqual([]);
  });
  it('recusa mantendo lead e histórico e registra o parecer', async () => {
    await service.decidir(comercial, 'r1', {
      action: 'REJECT',
      message: 'Manter cadastro',
    });
    expect(prisma.lead.delete).not.toHaveBeenCalled();
    expect(prisma.leadDeletionRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'RECUSADA',
          approvedById: comercial.sub,
          managementResponse: 'Manter cadastro',
        }),
      }),
    );
    expect(prisma.leadTimelineEvent.create).toHaveBeenCalled();
  });
  it('aprova preservando snapshot, chamados, conversas e resultados de importação', async () => {
    await service.decidir(comercial, 'r1', { action: 'APPROVE' });
    expect(prisma.leadDeletionRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'APROVADA',
          leadSnapshot: JSON.stringify(lead),
        }),
      }),
    );
    for (const entity of [
      prisma.ticket,
      prisma.chat,
      prisma.leadImportRowResult,
    ]) {
      expect(entity.updateMany).toHaveBeenCalledWith({
        where: { leadId: 'l1' },
        data: { leadId: null },
      });
    }
    expect(prisma.lead.delete).toHaveBeenCalledWith({ where: { id: 'l1' } });
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
  it('bloqueia exclusão de uma jornada convertida sem alterar a solicitação', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      ...lead,
      convertedProspectId: 'p1',
    });
    await expect(
      service.decidir(comercial, 'r1', { action: 'APPROVE' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.leadDeletionRequest.updateMany).not.toHaveBeenCalled();
    expect(prisma.lead.delete).not.toHaveBeenCalled();
  });
  it('não decide duas vezes nem exclui após conflito de concorrência', async () => {
    prisma.leadDeletionRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.decidir(comercial, 'r1', { action: 'APPROVE' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.lead.delete).not.toHaveBeenCalled();
    prisma.leadDeletionRequest.findUnique.mockResolvedValue({
      ...pending,
      status: 'APROVADA',
    });
    await expect(
      service.decidir(comercial, 'r1', { action: 'APPROVE' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('exclusão direta encerra a pendência e preserva histórico no mesmo commit', async () => {
    const module = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();
    await module.get(LeadsService).excluir(comercial, 'l1');
    expect(prisma.leadDeletionRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { leadId: 'l1', status: 'PENDENTE' },
        data: expect.objectContaining({
          status: 'CANCELADA',
          leadSnapshot: JSON.stringify(lead),
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalled();
    expect(prisma.ticket.updateMany).toHaveBeenCalledWith({
      where: { leadId: 'l1' },
      data: { leadId: null },
    });
  });
});
