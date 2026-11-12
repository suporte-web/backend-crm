import { BadRequestException } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import type { AuthUser } from '../auth/types/auth-user.type';

// Method unit tests; guards and service authorization have separate tests.
describe('ClientsController', () => {
  let controller: ClientsController;
  let clients: jest.Mocked<
    Pick<ClientsService, 'findAll' | 'findMine' | 'createDocument'>
  >;
  const user: AuthUser = {
    sub: 'owner-1',
    email: 'owner@example.com',
    role: 'COMERCIAL',
  };

  beforeEach(() => {
    clients = {
      findAll: jest.fn(),
      findMine: jest.fn(),
      createDocument: jest.fn(),
    };
    controller = new ClientsController(clients as unknown as ClientsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the actor and portfolio filters to the service', async () => {
    clients.findAll.mockResolvedValue([]);
    await expect(
      controller.findAll(user, 'owner-2', 'ATIVO', 'VAREJO'),
    ).resolves.toEqual([]);
    expect(clients.findAll).toHaveBeenCalledWith(user, {
      internalOwnerId: 'owner-2',
      status: 'ATIVO',
      segment: 'VAREJO',
    });
  });

  it('uses the current user id for their client profile', () => {
    controller.findMine(user);
    expect(clients.findMine).toHaveBeenCalledWith('owner-1');
  });

  it('rejects uploads with no files before creating a document', async () => {
    await expect(
      controller.uploadDocument(user, 'client-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(clients.createDocument).not.toHaveBeenCalled();
  });
});
