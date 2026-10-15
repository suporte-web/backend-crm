import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { LeadsService } from './leads.service';

const actor: AuthUser = {
  sub: 'comercial',
  email: 'c@crm.test',
  role: UserRole.COMERCIAL,
};
const origin = { prospectedById: 'consultora', prospectedByName: 'Carla' };
const lead = {
  id: 'l1',
  name: 'Empresa',
  company: 'Empresa',
  email: 'e@crm.test',
  phone: '123',
  notes: 'Contato inicial',
  source: 'manual',
  metadata: {},
  convertedProspectId: null,
  ...origin,
};

describe('Rastreabilidade das conversões existentes', () => {
  let service: LeadsService;
  const delegate = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  });
  let prisma: {
    lead: ReturnType<typeof delegate>;
    prospect: ReturnType<typeof delegate>;
    client: ReturnType<typeof delegate>;
    ticket: ReturnType<typeof delegate>;
    $transaction: jest.Mock;
  };
  beforeEach(async () => {
    prisma = {
      lead: delegate(),
      prospect: delegate(),
      client: delegate(),
      ticket: delegate(),
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.lead.findUnique.mockResolvedValue(lead);
    prisma.lead.update.mockResolvedValue(lead);
    prisma.prospect.create.mockResolvedValue({ id: 'p1' });
    prisma.client.create.mockResolvedValue({ id: 'c1' });
    const module = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();
    service = module.get(LeadsService);
  });
  it('transfere a autoria para novo Prospect e mantém vínculo do Lead', async () => {
    await service.convertToProspect(actor, 'l1', {});
    expect(prisma.prospect.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ...origin, sourceLeadId: 'l1' }),
    });
    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ convertedProspectId: 'p1' }),
      }),
    );
  });
  it('reutiliza prospect existente sem sobrescrever a autoria anterior', async () => {
    prisma.prospect.findFirst.mockResolvedValue({
      id: 'existing',
      prospectedById: 'outra-consultora',
    });
    await service.convertToProspect(actor, 'l1', {});
    expect(prisma.prospect.create).not.toHaveBeenCalled();
    expect(prisma.prospect.update).not.toHaveBeenCalled();
    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ convertedProspectId: 'existing' }),
      }),
    );
  });
  it('preserva consultora e os contatos relacionais ao converter para cliente', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      ...lead,
      convertedProspectId: 'p1',
    });
    prisma.prospect.findUnique.mockResolvedValue({
      id: 'p1',
      prospectedById: 'outra',
      prospectedByName: 'Outra',
    });
    await service.convertToClient(actor, 'l1', { document: '12345678000100' });
    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ...origin,
          sourceLeadId: 'l1',
          sourceProspectId: 'p1',
          contacts: {
            create: expect.objectContaining({
              email: lead.email,
              isPrimary: true,
            }),
          },
        }),
      }),
    );
  });
  it('recupera vínculo legado por metadata sem criar FK para prospect inexistente', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      ...lead,
      metadata: { prospectId: 'removido' },
    });
    prisma.prospect.findUnique.mockResolvedValue(null);
    await service.convertToClient(actor, 'l1', { document: '12345678000100' });
    expect(
      prisma.client.create.mock.calls[0][0].data.sourceProspectId,
    ).toBeUndefined();
  });
  it('mantém a rejeição de documento de cliente duplicado', async () => {
    prisma.client.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(
      service.convertToClient(actor, 'l1', { document: '12345678000100' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.client.create).not.toHaveBeenCalled();
  });
});
