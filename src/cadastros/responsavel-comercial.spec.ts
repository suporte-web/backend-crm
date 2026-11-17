import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { listarResponsaveisComerciais, resolverResponsavelComercial } from './responsavel-comercial';

describe('Responsável individual dentro da empresa consultora', () => {
  const actor = { sub: 'a', email: 'a@example.test', role: UserRole.CONSULTORA, empresaConsultoraId: 'empresa-a', empresaConsultoraAtiva: true };
  const colega = { id: 'b', name: 'Colega', isActive: true, role: 'CONSULTORA', empresaConsultoraId: 'empresa-a', empresaConsultora: { ativa: true } };
  const findUnique = jest.fn(), findMany = jest.fn();
  const prisma = { user: { findUnique, findMany } } as never;
  beforeEach(() => { findUnique.mockReset().mockResolvedValue(colega); findMany.mockReset().mockResolvedValue([]); });
  it('permite atribuir a um colega da mesma empresa', async () => {
    expect(await resolverResponsavelComercial(prisma, actor, 'b', 'a', 'empresa-a')).toEqual({ id: 'b', name: 'Colega', empresaConsultoraId: 'empresa-a' });
  });
  it('permite editar mantendo o colega responsável', async () => {
    await expect(resolverResponsavelComercial(prisma, actor, 'b', 'b', 'empresa-a')).resolves.toBeDefined();
  });
  it.each(['empresa-b', null])('impede atribuição fora da empresa: %s', async empresaConsultoraId => {
    findUnique.mockResolvedValue({ ...colega, empresaConsultoraId });
    await expect(resolverResponsavelComercial(prisma, actor, 'b', 'a', 'empresa-a')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('não permite remover responsável nem usar conta sem empresa ativa', async () => {
    await expect(resolverResponsavelComercial(prisma, actor, null, 'a', 'empresa-a')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(resolverResponsavelComercial(prisma, { ...actor, empresaConsultoraAtiva: false }, 'b')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('omissão não altera o vínculo', async () => {
    expect(await resolverResponsavelComercial(prisma, actor, undefined)).toBeUndefined();
    expect(findUnique).not.toHaveBeenCalled();
  });
  it('gestão também deve transferir a empresa explicitamente antes de mudar o responsável para outra carteira', async () => {
    await expect(resolverResponsavelComercial(prisma, { ...actor, role: UserRole.ADMIN }, 'b', 'a', 'empresa-b')).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each([null, { ...colega, isActive: false }, { ...colega, role: 'CLIENTE' }])('valida existência, atividade e perfil: %j', async destino => {
    findUnique.mockResolvedValue(destino);
    await expect(resolverResponsavelComercial(prisma, { ...actor, role: UserRole.ADMIN }, 'b')).rejects.toBeInstanceOf(BadRequestException);
  });
  it('as opções das consultoras contêm somente colegas ativos da mesma empresa', async () => {
    await listarResponsaveisComerciais(prisma, actor);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ empresaConsultoraId: 'empresa-a', isActive: true }) }));
  });
});
