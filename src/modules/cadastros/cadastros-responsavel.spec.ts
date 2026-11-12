import { CadastrosService } from './cadastros.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('Responsável preenchido no cadastro', () => {
  const usuario = { sub: 'autor-1', email: 'autor@exemplo.com', role: UserRole.COMERCIAL };
  function preparar(metadata: unknown, comLead = true) {
    const findMany = jest.fn().mockResolvedValue([{
      id: 'cadastro-1', internalOwnerId: usuario.sub,
      leadCadastro: comLead ? { id: 'lead-1', source: 'CRM', status: 'cotacao', email: null, metadata } : null,
    }]);
    const prisma = {
      client: { findMany },
      roleScreenPermission: { findMany: jest.fn().mockResolvedValue([]) },
    };
    return { service: new CadastrosService(prisma as unknown as PrismaService), findMany };
  }

  it('retorna o nome digitado sem expor os demais metadados', async () => {
    const { service, findMany } = preparar({ responsible: '  Maria Comercial  ', privado: 'não expor' });
    const [cadastro] = await service.listar(usuario);
    expect(cadastro.responsavel).toBe('Maria Comercial');
    expect(cadastro.internalOwnerId).toBe(usuario.sub);
    expect(cadastro.leadCadastro).toEqual({ id: 'lead-1', source: 'CRM', status: 'cotacao', email: null });
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it.each([null, {}, { responsible: 123 }, { responsible: '   ' }, []])(
    'trata responsável ausente ou inválido: %j', async (metadata) => {
      const { service } = preparar(metadata);
      const [cadastro] = await service.listar(usuario);
      expect(cadastro.responsavel || null).toBeNull();
    },
  );

  it('preserva cadastros sem Lead vinculado', async () => {
    const { service } = preparar(null, false);
    const [cadastro] = await service.listar(usuario);
    expect(cadastro.responsavel).toBeNull();
    expect(cadastro.leadCadastro).toBeNull();
  });

  it('preserva os vínculos da consultora e acrescenta os cadastros MCG', async () => {
    const { service, findMany } = preparar({ responsible: 'Maria' });
    await service.listar({ ...usuario, role: UserRole.CONSULTORA });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ AND: [{ OR: [
        { prospectedById: usuario.sub }, { internalOwnerId: usuario.sub },
        { leadCadastro: { createdById: usuario.sub } },
        { leadCadastro: { metadata: { path: ['responsible'], equals: 'MCG' } } },
      ] }] }),
    }));
  });
});
