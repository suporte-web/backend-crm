import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('UsersService', () => {
  let service: UsersService;
  const prisma = { user: { findUnique: jest.fn() } };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { create: jest.fn() } },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('looks up the email with the profile required for authentication', async () => {
    const user = {
      id: 'user-1',
      email: 'user@example.com',
      clientProfile: null,
    };
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(service.findByEmail('user@example.com')).resolves.toEqual(
      user,
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
      include: { clientProfile: true },
    });
  });

  it('returns null for an unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.findByEmail('missing@example.com'),
    ).resolves.toBeNull();
  });
});
