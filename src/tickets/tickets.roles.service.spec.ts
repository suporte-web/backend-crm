import { TicketsService } from './tickets.service';
import { UserRole } from '@prisma/client';

describe('Tickets with multiple profiles', () => {
  it('includes both commercial and management responsibilities', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new TicketsService({ ticket: { findMany } } as never, {} as never, {} as never, {} as never);
    await service.findAll({ sub: 'user-1', role: 'GESTAO', roles: ['GESTAO', 'COMERCIAL'] }, {});
    const where = JSON.stringify(findMany.mock.calls[0][0].where);
    expect(where).toContain(`"requiresActionRole":"${UserRole.COMERCIAL}"`);
    expect(where).toContain(`"requiresActionRole":"${UserRole.GESTAO}"`);
  });
  it('does not restrict Admin to the additional profile responsibilities', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new TicketsService({ ticket: { findMany } } as never, {} as never, {} as never, {} as never);
    await service.findAll({ sub: 'user-1', role: 'ADMIN', roles: ['ADMIN', 'COMERCIAL'] }, {});
    expect(JSON.stringify(findMany.mock.calls[0][0].where)).not.toContain('requiresActionRole');
  });
});
