/* Os bancos em memória preservam a interface assíncrona do Prisma. */
/* eslint-disable @typescript-eslint/require-await */
import { NotificationsService } from '../notifications/notifications.service';
import { OportunidadesService } from './oportunidades.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UserRole } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('Acesso a oportunidades por cadastro', () => {
  it('impede excluir por ID direto a oportunidade de outro responsável', async () => {
    const prisma = {
      client: { findFirst: async () => null },
      opportunity: {
        findUnique: async () => ({
          id: 'o1',
          clientId: 'c1',
          client: { modalidadeCadastro: 'LEAD', internalOwnerId: 'outro' },
        }),
      },
      roleScreenPermission: {
        findMany: async () => [
          { role: 'CONSULTORA', screenKey: 'opportunities', isEnabled: true },
        ],
      },
      $transaction: () => {
        throw new Error('Não deve iniciar uma exclusão sem permissão.');
      },
    } as unknown as PrismaService;
    const servico = new OportunidadesService(prisma, {} as AuditLogsService, {} as NotificationsService);
    await expect(
      servico.excluir(
        {
          sub: 'consultora',
          email: 'c@example.invalid',
          role: UserRole.CONSULTORA,
        },
        'o1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
