import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { filtroResponsavelCadastro, validarAutoriaCadastro } from './permissoes-cadastros';
import { assertOpportunityOwner } from './opportunity-access';
import { validarEmpresaLead } from './empresa-consultora-access';

describe('Carteira compartilhada por empresa consultora', () => {
  const consultora = { sub: 'a', email: 'a@example.test', role: UserRole.CONSULTORA, empresaConsultoraId: 'empresa-a', empresaConsultoraAtiva: true };
  const prisma = {} as PrismaService;
  const cadastro = { id: 'cadastro', internalOwnerId: 'outro', prospectedById: 'outro', responsavelId: 'colega', empresaConsultoraId: 'empresa-a' as string | null };
  it('limita a listagem pela empresa inclusive com perfis combinados', () => {
    expect(filtroResponsavelCadastro(consultora)).toEqual({ empresaConsultoraId: 'empresa-a' });
    expect(filtroResponsavelCadastro({ ...consultora, roles: ['ADMIN', 'CONSULTORA'] })).toEqual({ empresaConsultoraId: 'empresa-a' });
  });
  it('permite detalhes e oportunidades de colegas da mesma empresa', async () => {
    await expect(validarAutoriaCadastro(prisma, consultora, cadastro)).resolves.toBeUndefined();
    expect(() => assertOpportunityOwner(consultora, cadastro)).not.toThrow();
  });
  it.each(['empresa-b', null, undefined])('nega outra carteira mesmo quando o usuário é responsável individual: %s', async empresaConsultoraId => {
    const registro = { ...cadastro, responsavelId: consultora.sub, empresaConsultoraId };
    await expect(validarAutoriaCadastro(prisma, consultora, registro)).rejects.toBeInstanceOf(ForbiddenException);
    expect(() => assertOpportunityOwner(consultora, registro)).toThrow(ForbiddenException);
  });
  it.each([{ empresaConsultoraId: null }, { empresaConsultoraAtiva: false }, { empresaConsultoraAtiva: undefined }])('bloqueia conta sem empresa ativa: %j', dados => {
    expect(() => filtroResponsavelCadastro({ ...consultora, ...dados })).toThrow(ForbiddenException);
  });
  it.each([UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.MARKETING])('preserva escopo dos demais perfis: %s', async role => {
    const user = { ...consultora, role, empresaConsultoraId: null };
    expect(filtroResponsavelCadastro(user)).toEqual({});
    await expect(validarAutoriaCadastro(prisma, user, cadastro)).resolves.toBeUndefined();
  });
  it('protege o acesso direto ao lead pela carteira canônica e não pela autoria', async () => {
    const client = { findFirst: jest.fn().mockResolvedValue(null) };
    await expect(validarEmpresaLead({ client } as never, consultora, 'lead-b')).rejects.toBeInstanceOf(ForbiddenException);
    expect(client.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ empresaConsultoraId: 'empresa-a' }) }));
    client.findFirst.mockResolvedValue({ id: 'cadastro-colega' } as never);
    await expect(validarEmpresaLead({ client } as never, consultora, 'lead-colega')).resolves.toBeUndefined();
  });
});
