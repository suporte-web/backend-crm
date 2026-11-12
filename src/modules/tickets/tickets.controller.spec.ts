import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

describe('TicketsController', () => {
  let controller: TicketsController;
  let tickets: jest.Mocked<
    Pick<TicketsService, 'findAll' | 'findMine' | 'findOne'>
  >;
  const user = { sub: 'user-1', role: 'COMERCIAL' };

  beforeEach(() => {
    tickets = { findAll: jest.fn(), findMine: jest.fn(), findOne: jest.fn() };
    controller = new TicketsController(tickets as unknown as TicketsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the actor and all search filters to the service', async () => {
    tickets.findAll.mockResolvedValue([]);
    await expect(
      controller.findAll(user, 'ABERTO', 'COTACAO', 'shipment'),
    ).resolves.toEqual([]);
    expect(tickets.findAll).toHaveBeenCalledWith(user, {
      status: 'ABERTO',
      type: 'COTACAO',
      q: 'shipment',
    });
  });

  it('scopes the personal list to the current user', () => {
    controller.findMine(user, undefined, undefined, 'shipment');
    expect(tickets.findMine).toHaveBeenCalledWith('user-1', {
      status: undefined,
      type: undefined,
      q: 'shipment',
    });
  });

  it('preserves the actor for the ticket access check', () => {
    controller.findOne(user, 'ticket-1');
    expect(tickets.findOne).toHaveBeenCalledWith(user, 'ticket-1');
  });
});
