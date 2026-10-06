import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UserRole } from '@prisma/client';
const databaseTest = process.env.PROFILES_TEST_LOCAL_DATABASE === '1' ? describe : describe.skip;
databaseTest('Multiple profiles with real local database', () => {
  it('creates, reloads, edits and preserves selected profiles without leaving test data', async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('This test requires a local database');
    const prisma = new PrismaService(new ConfigService());
    const rollback = new Error('ROLLBACK_PROFILE_TEST');
    try {
      await prisma.onModuleInit();
      await expect(prisma.$transaction(async (tx) => {
        const service = new UsersService(tx as unknown as PrismaService, { create: async () => undefined } as unknown as AuditLogsService);
        const created = await service.create({
          name: 'Profile integration test', email: `profiles-${randomUUID()}@example.test`, password: 'Test-only-password-2026',
          roles: [UserRole.ATENDIMENTO, UserRole.ADMIN, UserRole.GESTAO],
        });
        expect(created.roles).toEqual([UserRole.ADMIN, UserRole.GESTAO, UserRole.ATENDIMENTO]);
        expect(created.isActive).toBe(true);
        expect((await service.findOne(created.id)).roles).toEqual(created.roles);
        const edited = await service.update(created.id, { roles: [UserRole.OPERACAO, UserRole.ATENDIMENTO] });
        expect(edited.roles).toEqual([UserRole.OPERACAO, UserRole.ATENDIMENTO]);
        expect(edited.role).toBe(UserRole.OPERACAO);
        const disabled = await service.update(created.id, { isActive: false });
        expect(disabled.roles).toEqual(edited.roles);
        expect(disabled.isActive).toBe(false);
        throw rollback;
      }, { timeout: 15000 })).rejects.toBe(rollback);
    } finally {
      await prisma.onModuleDestroy();
    }
  }, 30000);
});
