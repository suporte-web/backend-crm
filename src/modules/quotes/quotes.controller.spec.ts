import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('QuotesController', () => {
  let controller: QuotesController;
  let quotes: jest.Mocked<
    Pick<QuotesService, 'findMine' | 'findOne' | 'findAll'>
  >;
  const prisma = { client: { findUnique: jest.fn() } };
  const user = { sub: 'user-1', role: 'CLIENTE' };

  beforeEach(() => {
    jest.resetAllMocks();
    quotes = { findMine: jest.fn(), findOne: jest.fn(), findAll: jest.fn() };
    controller = new QuotesController(
      quotes as unknown as QuotesService,
      prisma as unknown as PrismaService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('resolves the authenticated client before listing personal quotes', async () => {
    prisma.client.findUnique.mockResolvedValue({ id: 'client-1' });
    quotes.findMine.mockResolvedValue([]);
    await expect(controller.findMine(user)).resolves.toEqual([]);
    expect(prisma.client.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(quotes.findMine).toHaveBeenCalledWith('client-1');
  });

  it('rejects a missing client profile before listing quotes', async () => {
    prisma.client.findUnique.mockResolvedValue(null);
    await expect(controller.findMine(user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(quotes.findMine).not.toHaveBeenCalled();
  });

  it('rejects an empty quote id before calling the service', () => {
    expect(() => controller.findOne(user, '')).toThrow(BadRequestException);
    expect(quotes.findOne).not.toHaveBeenCalled();
  });

  it('preserves actor and list filters for service authorization', () => {
    controller.findAll(user, 'PENDENTE', 'client-1');
    expect(quotes.findAll).toHaveBeenCalledWith(user, {
      status: 'PENDENTE',
      clientId: 'client-1',
    });
  });
});
