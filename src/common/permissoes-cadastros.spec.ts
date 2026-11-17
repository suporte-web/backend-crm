import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { filtroResponsavelCadastro, validarAutoriaCadastro } from './permissoes-cadastros';
import { assertOpportunityOwner } from './opportunity-access';
import { UserRole } from '@prisma/client';

describe('Cadastros por responsável comercial', () => {
  const consultora = { sub: 'a', email: 'a@example.test', role: UserRole.CONSULTORA };
  const prisma = { lead: { findUnique: jest.fn() } } as unknown as PrismaService;
  const cadastro = { id: 'cadastro', internalOwnerId: 'a', prospectedById: 'a', responsavelId: 'b' as string | null };

  it('Consultora recebe filtro obrigatório por ID, inclusive em perfis combinados', () => {
    expect(filtroResponsavelCadastro(consultora)).toEqual({ responsavelId: 'a' });
    expect(filtroResponsavelCadastro({ ...consultora, roles: ['ADMIN', 'CONSULTORA'] })).toEqual({ responsavelId: 'a' });
  });

  it.each([UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.MARKETING])('preserva acesso sem filtro de responsável para %s', async role => {
    const user = { ...consultora, role };
    expect(filtroResponsavelCadastro(user)).toEqual({});
    await expect(validarAutoriaCadastro(prisma, user, cadastro)).resolves.toBeUndefined();
  });

  it.each(['b', null, undefined])('autoria, prospecção e responsável interno não substituem vínculo atual: %s', async responsavelId => {
    await expect(validarAutoriaCadastro(prisma, consultora, { ...cadastro, responsavelId })).rejects.toBeInstanceOf(ForbiddenException);
    expect(() => assertOpportunityOwner(consultora, { ...cadastro, responsavelId })).toThrow(ForbiddenException);
  });

  it('permite o cadastro atribuído à Consultora mesmo quando foi criado por outra pessoa', async () => {
    const proprio = { ...cadastro, internalOwnerId: 'b', prospectedById: 'b', responsavelId: 'a' };
    await expect(validarAutoriaCadastro(prisma, consultora, proprio)).resolves.toBeUndefined();
    expect(() => assertOpportunityOwner(consultora, proprio)).not.toThrow();
    expect(prisma.lead.findUnique).not.toHaveBeenCalled();
  });
});
