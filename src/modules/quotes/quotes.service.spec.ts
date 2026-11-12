import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QuotesService } from './quotes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('QuotesService', () => {
  let service: QuotesService;
  const prisma = { quote: { findUnique: jest.fn(), findMany: jest.fn() } };
  const user = { sub: 'client-user', role: 'CLIENTE' };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { create: jest.fn() } },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();
    service = module.get(QuotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects an unknown quote', async () => {
    prisma.quote.findUnique.mockResolvedValue(null);
    await expect(service.findOne(user, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('hides a quote owned by another client', async () => {
    prisma.quote.findUnique.mockResolvedValue({
      id: 'quote-1',
      client: { userId: 'another-client' },
    });
    await expect(service.findOne(user, 'quote-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns a quote owned by the authenticated client', async () => {
    const quote = { id: 'quote-1', client: { userId: 'client-user' } };
    prisma.quote.findUnique.mockResolvedValue(quote);
    await expect(service.findOne(user, 'quote-1')).resolves.toEqual(quote);
    expect(prisma.quote.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'quote-1' } }),
    );
  });

  it('rejects client access to the internal list before querying it', async () => {
    await expect(service.findAll(user, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.quote.findMany).not.toHaveBeenCalled();
  });
});
