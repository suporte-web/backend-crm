/* Os bancos em memória preservam a interface assíncrona do Prisma. */
/* eslint-disable @typescript-eslint/require-await */
import { OportunidadesService } from './oportunidades.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UserRole } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('Acesso a oportunidades por cadastro', () => {
  it('impede excluir por ID direto a oportunidade de outro responsável', async () => {
    const prisma = {
      opportunity: {
        findUnique: async () => ({
          id: 'o1',
          clientId: 'c1',
          client: { modalidadeCadastro: 'LEAD', internalOwnerId: 'outro' },
        }),
      },
      roleScreenPermission: { findMany: async () => [] },
      $transaction: () => {
        throw new Error('Não deve iniciar uma exclusão sem permissão.');
      },
    } as unknown as PrismaService;
    const servico = new OportunidadesService(prisma, {} as AuditLogsService);
    await expect(
      servico.excluir(
        {
          sub: 'comercial',
          email: 'c@example.invalid',
          role: UserRole.COMERCIAL,
        },
        'o1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
