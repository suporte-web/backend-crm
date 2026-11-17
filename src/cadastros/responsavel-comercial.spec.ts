import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { resolverResponsavelComercial } from './responsavel-comercial';

describe('Atribuição do responsável comercial', () => {
  const actor = { sub: 'a', email: 'a@example.test', role: UserRole.CONSULTORA };
  const user = jest.fn();
  const prisma = { user: { findUnique: user } } as unknown as Pick<Prisma.TransactionClient, 'user'>;
  beforeEach(() => user.mockReset());
  it('consultora não transfere nem remove responsabilidade', async () => {
    await expect(resolverResponsavelComercial(prisma, actor, 'b', 'a')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(resolverResponsavelComercial(prisma, actor, null, 'a')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(resolverResponsavelComercial(prisma, actor, 'a', 'b')).rejects.toBeInstanceOf(ForbiddenException);
    expect(user).not.toHaveBeenCalled();
  });
  it('não usa texto ou criador para inferir uma atribuição ausente', async () => {
    expect(await resolverResponsavelComercial(prisma, actor, undefined)).toBeUndefined();
    expect(user).not.toHaveBeenCalled();
  });
  it('valida existência, perfil e atividade do usuário de destino', async () => {
    const admin = { ...actor, role: UserRole.ADMIN };
    for (const value of [null, { id: 'b', isActive: false, role: 'CONSULTORA' }, { id: 'b', isActive: true, role: 'CLIENTE' }]) {
      user.mockResolvedValue(value);
      await expect(resolverResponsavelComercial(prisma, admin, 'b')).rejects.toBeInstanceOf(BadRequestException);
    }
    user.mockResolvedValue({ id: 'b', name: 'Nome do banco', isActive: true, role: 'CONSULTORA' });
    expect(await resolverResponsavelComercial(prisma, admin, 'b')).toEqual({ id: 'b', name: 'Nome do banco' });
  });
});
