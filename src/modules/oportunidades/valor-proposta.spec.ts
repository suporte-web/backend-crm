import { ClientsService } from '../clientes/clients.service';
import { UsersService } from '../users/users.service';
import { Prisma, UserRole } from '@prisma/client';
import { OportunidadesService } from './oportunidades.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('Valor da proposta comercial vinculada na listagem', () => {
  const usuario = { sub: 'comercial-1', email: 'comercial@exemplo.com', role: UserRole.COMERCIAL };
  function preparar(valor: string | null, semProposta = false) {
    const original = { id: 'o-1', value: new Prisma.Decimal(900), clientId: 'c-1', propostas: semProposta ? [] : [{ valor: valor === null ? null : new Prisma.Decimal(valor) }] };
    const findMany = jest.fn().mockResolvedValue([original]);
    const buscarAutoria = jest.fn(async ({ where }) =>
      where.createdById === usuario.sub &&
      where.type === 'OPPORTUNITY_CREATED' &&
      (!where.clientId || where.clientId === original.clientId)
        ? [{ metadata: { opportunityId: original.id } }]
        : [],
    );
    const prisma = {
      opportunity: { findMany },
      timelineEvent: { findMany: buscarAutoria },
      roleScreenPermission: { findMany: jest.fn().mockResolvedValue([{ role: UserRole.CONSULTORA, screenKey: 'opportunities', isEnabled: true }]) },
    };
    return { service: new OportunidadesService(prisma as unknown as PrismaService, {} as AuditLogsService, {} as NotificationsService), findMany, buscarAutoria };
  }

  it('retorna o valor da proposta sem alterar o valor original da oportunidade', async () => {
    const { service, findMany } = preparar('12345.67');
    const [item] = await service.listar(usuario, {});
    expect(item.valorPropostaComercial).toBe('12345.67');
    expect(item.value?.toString()).toBe('900');
    expect(item).not.toHaveProperty('propostas');
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ include: expect.objectContaining({
      propostas: expect.objectContaining({
        take: 1, select: { valor: true },
        where: { status: { notIn: ['CANCELADA', 'EXPIRADA'] } },
        orderBy: [{ createdAt: 'desc' }, { versao: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
      }),
    }) }));
  });

  it('usa a proposta nova de outro ticket antes de uma versão alta antiga', async () => {
    const { service, findMany } = preparar('0');
    const propostas = [
      { ticketId: 'ticket-antigo', versao: 3, createdAt: new Date('2026-10-01'), valor: new Prisma.Decimal(100) },
      { ticketId: 'ticket-novo', versao: 1, createdAt: new Date('2026-11-01'), valor: new Prisma.Decimal(500) },
    ];
    findMany.mockImplementationOnce((consulta: { include: { propostas: { orderBy: Record<string, string>[] } } }) => {
      // Simula a ordenação solicitada ao Prisma, com versões reiniciadas por ticket.
      const primeiroCampo = Object.keys(consulta.include.propostas.orderBy[0])[0];
      const ordenadas = [...propostas].sort((a, b) => primeiroCampo === 'createdAt'
        ? b.createdAt.getTime() - a.createdAt.getTime() : b.versao - a.versao);
      return Promise.resolve([{ id: 'o-1', value: null, propostas: [{ valor: ordenadas[0].valor }] }]);
    });
    expect((await service.listar(usuario, {}))[0].valorPropostaComercial).toBe('500');
  });

  it('preserva valor zero explicitamente informado na proposta', async () => {
    const { service } = preparar('0');
    expect((await service.listar(usuario, {}))[0].valorPropostaComercial).toBe('0');
  });

  it.each([true, false])('não inventa valor para proposta ausente ou sem preço: %s', async (semProposta) => {
    const { service } = preparar(null, semProposta);
    expect((await service.listar(usuario, {}))[0].valorPropostaComercial).toBeNull();
  });

  it('preserva a autoria da consultora e os filtros da listagem', async () => {
    const { service, findMany, buscarAutoria } = preparar('2500');
    await service.listar({ ...usuario, role: UserRole.CONSULTORA }, { etapa: 'PROPOSTA', clienteId: 'c-1', situacao: 'OPEN' });
    expect(buscarAutoria).toHaveBeenCalledWith({
      where: { createdById: usuario.sub, type: 'OPPORTUNITY_CREATED', clientId: 'c-1' },
      select: { metadata: true },
    });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      clientId: 'c-1', stage: 'PROPOSTA', status: 'OPEN',
      id: { in: ['o-1'] },
      client: {
        modalidadeCadastro: { in: ['CLIENTE', 'LEAD'] },
        leadCadastro: { metadata: { path: ['responsible'], equals: 'MCG' } },
      },
    }) }));
  });
});

describe('Valor comercial nas respostas de cliente', () => {
  it('entrega apenas o valor calculado em detalhe, resumo e cadastro, mantendo as métricas existentes', async () => {
    const prisma = { client: { findUnique: jest.fn().mockResolvedValue({
      id: 'c-1', user: null, quotes: [], timelineEvents: [], contacts: [], documents: [],
      opportunities: [{ id: 'o-1', value: new Prisma.Decimal(900), status: 'OPEN', propostas: [{ valor: new Prisma.Decimal('12345.67') }] }],
    }) } };
    const service = new ClientsService(prisma as unknown as PrismaService, {} as AuditLogsService, {} as NotificationsService, {} as UsersService);
    const usuario = { sub: 'comercial-1', email: 'comercial@exemplo.com', role: UserRole.COMERCIAL };
    const cadastro = await service.findOne(usuario, 'c-1');
    const resumo = await service.getSummary(usuario, 'c-1');
    const detalhe = await service.getDetail(usuario, 'c-1');
    for (const item of [cadastro.opportunities[0], resumo.lastOpportunity, detalhe.opportunities[0]]) {
      expect(item?.valorPropostaComercial).toBe('12345.67');
      expect(item?.value?.toString()).toBe('900');
      expect(item).not.toHaveProperty('propostas');
    }
    expect(resumo.metrics.openValue).toBe(900);
    expect(detalhe.metrics.openValue).toBe(900);
  });
});
