import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatsService } from '../chats/chats.service';

describe('TicketsService', () => {
  let service: TicketsService;
  const prisma = { ticket: { findUnique: jest.fn() } };
  const notifications = { markTicketNotificationsRead: jest.fn() };
  const user = { sub: 'client-user', role: 'CLIENTE' };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { create: jest.fn() } },
        { provide: NotificationsService, useValue: notifications },
        { provide: ChatsService, useValue: {} },
      ],
    }).compile();
    service = module.get(TicketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects a missing ticket without marking notifications read', async () => {
    prisma.ticket.findUnique.mockResolvedValue(null);
    await expect(service.findOne(user, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(notifications.markTicketNotificationsRead).not.toHaveBeenCalled();
  });

  it.each([
    { client: { userId: 'another-client' }, internalOnly: false },
    { client: { userId: 'client-user' }, internalOnly: true },
  ])('hides tickets that the client cannot access: %j', async (access) => {
    prisma.ticket.findUnique.mockResolvedValue({
      id: 'ticket-1',
      formPayload: null,
      leadId: null,
      ...access,
    });
    await expect(service.findOne(user, 'ticket-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(notifications.markTicketNotificationsRead).not.toHaveBeenCalled();
  });

  it('returns an owned ticket and marks only the current user notifications read', async () => {
    const ticket = {
      id: 'ticket-1',
      formPayload: null,
      leadId: null,
      client: { userId: 'client-user' },
      internalOnly: false,
    };
    prisma.ticket.findUnique.mockResolvedValue(ticket);
    await expect(service.findOne(user, 'ticket-1')).resolves.toEqual(ticket);
    expect(prisma.ticket.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ticket-1' } }),
    );
    expect(notifications.markTicketNotificationsRead).toHaveBeenCalledWith(
      'client-user',
      'ticket-1',
    );
  });

  it('keeps SAC occurrences out of the tickets module', async () => {
    prisma.ticket.findUnique.mockResolvedValue({
      id: 'ticket-1',
      formPayload: { canal: 'RECLAMACOES_ELOGIOS' },
    });
    await expect(
      service.findOne({ sub: 'admin-1', role: 'ADMIN' }, 'ticket-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(notifications.markTicketNotificationsRead).not.toHaveBeenCalled();
  });
});
