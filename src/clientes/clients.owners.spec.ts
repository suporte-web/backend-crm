import { UserRole } from '@prisma/client';
import { ClientsService } from './clients.service';

it('Comercial vê a identificação e os indicadores das consultoras responsáveis', async () => {
  const consultora = { id: 'c1', name: 'Maria', email: 'c@example.test', role: UserRole.CONSULTORA };
  const prisma = {
    user: { findMany: async ({ where }: any) => {
      const includes = where.role?.in?.includes('CONSULTORA') || where.OR?.some((p: any) => p.role?.in?.includes('CONSULTORA') || p.roles?.hasSome?.includes('CONSULTORA'));
      return includes ? [consultora] : [];
    } },
    client: { findMany: async () => [{ id: 'empresa', internalOwnerId: 'c1', status: 'ATIVO' }] },
  };
  const service: ClientsService = Reflect.construct(ClientsService, [prisma, {}, {}, {}]);
  const resultado = await service.getOwnersSummary({ sub: 'comercial', role: 'COMERCIAL' });
  expect(resultado).toEqual([{ owner: consultora, metrics: { totalClients: 1, activeClients: 1 } }]);
});
