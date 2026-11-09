import { ConflictException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ClientsService } from './clients.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

describe('ClientsService', () => {
  let service: ClientsService;
  const actor = { sub: 'admin', email: 'admin@example.com', role: UserRole.ADMIN };
  let findFirst: jest.Mock;
  let createUser: jest.Mock;

  beforeEach(() => {
    findFirst = jest.fn().mockResolvedValue(null);
    createUser = jest.fn(async (data) => ({ id: 'new-client', ...data }));
    service = new ClientsService(
      { client: { findFirst } } as unknown as PrismaService,
      {} as AuditLogsService,
      {} as NotificationsService,
      { create: createUser } as unknown as UsersService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.each([undefined, '', '   '])('cadastra cliente sem documento (%p)', async (document) => {
    findFirst.mockResolvedValue({ id: 'client-without-document' });
    const result = await service.create(actor, { companyName: 'Empresa nova', document });
    expect(result).toEqual(expect.objectContaining({ name: 'Empresa nova', document: undefined }));
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('normaliza o documento informado', async () => {
    const result = await service.create(actor, { companyName: 'Empresa nova', document: '12.345.678/0001-90' });
    expect(result).toEqual(expect.objectContaining({ document: '12345678000190' }));
  });

  it('continua rejeitando documento já cadastrado', async () => {
    findFirst.mockResolvedValue({ id: 'existing', companyName: 'Empresa existente' });
    await expect(service.create(actor, { companyName: 'Empresa nova', document: '12.345.678/0001-90' }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(createUser).not.toHaveBeenCalled();
  });
});
