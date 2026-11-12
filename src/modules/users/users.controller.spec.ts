import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import type { AuthUser } from '../auth/types/auth-user.type';

describe('UsersController', () => {
  let controller: UsersController;
  let users: jest.Mocked<
    Pick<
      UsersService,
      'create' | 'update' | 'remove' | 'resetPasswordToDefault'
    >
  >;
  const actor: AuthUser = {
    sub: 'admin-1',
    email: 'admin@example.com',
    role: 'ADMIN',
  };

  beforeEach(() => {
    users = {
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      resetPasswordToDefault: jest.fn(),
    };
    controller = new UsersController(users as unknown as UsersService);
  });

  it('preserves the authenticated actor when creating a user', () => {
    const dto = {
      name: 'New user',
      email: 'new@example.com',
      role: 'COMERCIAL' as const,
    };
    controller.create(actor, dto);
    expect(users.create).toHaveBeenCalledWith(dto, actor);
  });

  it('preserves the actor and target when updating a user', () => {
    const dto = { name: 'Updated' };
    controller.update(actor, 'user-2', dto);
    expect(users.update).toHaveBeenCalledWith('user-2', dto, actor);
  });

  it('preserves the actor and target when removing a user', () => {
    controller.remove(actor, 'user-2');
    expect(users.remove).toHaveBeenCalledWith('user-2', actor);
  });

  it('passes the actor to the audited password reset', () => {
    controller.resetPassword('user-2', actor);
    expect(users.resetPasswordToDefault).toHaveBeenCalledWith('user-2', actor);
  });
});
