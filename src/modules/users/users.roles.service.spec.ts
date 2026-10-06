import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UserRole } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { normalizeUserRoles } from '../../common/user-roles';

describe('UsersService multiple profiles', () => {
  const original = { id: 'user-1', name: 'Maria', email: 'maria@example.com', role: UserRole.GESTAO, roles: [UserRole.GESTAO], isActive: true };
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock; findMany: jest.Mock }; roleScreenPermission: { findMany: jest.Mock } };
  let service: UsersService;
  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(original),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...original, ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) })),
        findMany: jest.fn().mockResolvedValue([original]),
      },
      roleScreenPermission: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new UsersService(prisma as unknown as PrismaService, { create: jest.fn() } as unknown as AuditLogsService);
  });
  it('persists all profiles and keeps Admin as the legacy primary profile', async () => {
    const user = await service.update(original.id, { roles: [UserRole.ATENDIMENTO, UserRole.ADMIN, UserRole.GESTAO] });
    expect(user.roles).toEqual([UserRole.ADMIN, UserRole.GESTAO, UserRole.ATENDIMENTO]);
    expect(user.role).toBe(UserRole.ADMIN);
    expect(prisma.user.update.mock.calls[0][0].data.roles).toEqual(user.roles);
    expect(prisma.roleScreenPermission.findMany.mock.calls[0][0].where.role.in).toEqual(user.roles);
  });
  it('keeps all profiles when only status is changed', async () => {
    const user = await service.update(original.id, { isActive: false });
    expect(user.roles).toEqual([UserRole.GESTAO]);
    expect(user.isActive).toBe(false);
    expect(prisma.user.update.mock.calls[0][0].data.roles).toBeUndefined();
  });
  it('accepts legacy requests with a single profile', async () => {
    expect((await service.update(original.id, { role: UserRole.ATENDIMENTO })).roles).toEqual([UserRole.ATENDIMENTO]);
  });
  it('returns screen permissions for all selected profiles', async () => {
    prisma.user.findMany.mockResolvedValue([{ ...original, roles: [UserRole.GESTAO, UserRole.ATENDIMENTO] }]);
    const permissions = [
      { id: '1', role: UserRole.GESTAO, screenKey: 'users', isEnabled: false },
      { id: '2', role: UserRole.ATENDIMENTO, screenKey: 'atendimentoSac', isEnabled: true },
    ];
    prisma.roleScreenPermission.findMany.mockResolvedValue(permissions);
    expect((await service.findAll())[0].screenPermissions).toEqual(permissions);
  });
  it('does not mix client and internal profiles', () => {
    expect(() => normalizeUserRoles([UserRole.CLIENTE, UserRole.ADMIN])).toThrow(BadRequestException);
  });
  it('deduplicates profiles and rejects an empty selection', () => {
    expect(normalizeUserRoles([UserRole.ADMIN, UserRole.ADMIN])).toEqual([UserRole.ADMIN]);
    expect(() => normalizeUserRoles([])).toThrow(BadRequestException);
  });
});
