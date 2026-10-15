import { Test } from '@nestjs/testing';
import { EntradaOrigem, TicketType, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EntradasService } from './entradas.service';

const actor = {
  sub: 'comercial',
  email: 'c@crm.test',
  role: UserRole.COMERCIAL,
};
const origin = { prospectedById: 'consultora', prospectedByName: 'Carla' };
describe('Origem de prospects criados pela entrada', () => {
  const ticket = {
    id: 't1',
    leadId: 'l1',
    nomeSolicitante: 'Empresa',
    formPayload: null,
    origem: EntradaOrigem.MANUAL,
    type: TicketType.COTACAO,
  };
  let service: EntradasService;
  let prisma: {
    ticket: { findFirst: jest.Mock; update: jest.Mock };
    lead: { findUnique: jest.Mock; update: jest.Mock };
    prospect: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  beforeEach(async () => {
    prisma = {
      ticket: {
        findFirst: jest.fn().mockResolvedValue(ticket),
        update: jest.fn().mockResolvedValue(ticket),
      },
      lead: {
        findUnique: jest.fn().mockResolvedValue({ id: 'l1', ...origin }),
        update: jest.fn(),
      },
      prospect: { create: jest.fn().mockResolvedValue({ id: 'p1' }) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    const module = await Test.createTestingModule({
      providers: [
        EntradasService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();
    service = module.get(EntradasService);
  });
  it('preserva autoria e liga as duas direções para a conversão posterior', async () => {
    await service.linkOrCreateProspect(actor, 't1', {});
    expect(prisma.prospect.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceLeadId: 'l1',
        ...origin,
        createdFromTicketId: 't1',
      }),
    });
    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'l1' },
      data: { convertedProspectId: 'p1' },
    });
    expect(prisma.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ prospectId: 'p1' }),
      }),
    );
  });
  it('preserva entradas sem lead sem inventar origem', async () => {
    prisma.ticket.findFirst.mockResolvedValue({ ...ticket, leadId: null });
    await service.linkOrCreateProspect(actor, 't1', {});
    expect(prisma.lead.findUnique).not.toHaveBeenCalled();
    expect(prisma.lead.update).not.toHaveBeenCalled();
    expect(
      prisma.prospect.create.mock.calls[0][0].data.prospectedById,
    ).toBeUndefined();
  });
});
