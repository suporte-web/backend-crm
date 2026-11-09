import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UserRole } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { normalizeUserRoles } from '../../common/user-roles';
import * as bcrypt from 'bcrypt';

describe('UsersService multiple profiles', () => {
  it('accepts Consultora as an exclusive profile', () => {
    expect(normalizeUserRoles(['CONSULTORA' as UserRole])).toEqual(['CONSULTORA']);
    expect(() => normalizeUserRoles(['CONSULTORA' as UserRole, UserRole.ADMIN])).toThrow(BadRequestException);
  });
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
  it('creates Consultora with the supplied password and requires a password change', async () => {
    let passwordHash = '';
    const create = jest.fn(async ({ data }) => { passwordHash = data.passwordHash; return { id: 'new-consultora', ...data }; });
    const createPrisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null), create },
      roleScreenPermission: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const createService = new UsersService(createPrisma as unknown as PrismaService, { create: jest.fn() } as unknown as AuditLogsService);
    const created = await createService.create({ name: 'Maria', email: 'maria@example.test', role: UserRole.CONSULTORA, password: 'Test-password-123' });
    expect(created.role).toBe(UserRole.CONSULTORA);
    expect(created.roles).toEqual([UserRole.CONSULTORA]);
    expect(created.mustChangePassword).toBe(true);
    expect(await bcrypt.compare('Test-password-123', passwordHash)).toBe(true);
  });

  it('changes an internal user to Consultora without keeping previous profiles', async () => {
    const updated = await service.update(original.id, { role: UserRole.CONSULTORA });
    expect(updated.role).toBe(UserRole.CONSULTORA);
    expect(updated.roles).toEqual([UserRole.CONSULTORA]);
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
