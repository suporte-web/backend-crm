import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { AuthUser } from './types/auth-user.type';

describe('AuthController', () => {
  let controller: AuthController;
  let auth: jest.Mocked<Pick<AuthService, 'login' | 'me' | 'changePassword'>>;
  const user: AuthUser = {
    sub: 'user-1',
    email: 'user@example.com',
    role: 'CLIENTE',
  };

  beforeEach(() => {
    auth = { login: jest.fn(), me: jest.fn(), changePassword: jest.fn() };
    controller = new AuthController(auth as unknown as AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the supplied credentials to login', () => {
    const dto = { email: 'user@example.com', password: 'example-password' };
    controller.login(dto);
    expect(auth.login).toHaveBeenCalledWith(dto);
  });

  it('loads the authenticated user profile', () => {
    controller.me(user);
    expect(auth.me).toHaveBeenCalledWith('user-1');
  });

  it('changes the password for the authenticated user', () => {
    const dto = {
      currentPassword: 'current-password',
      newPassword: 'new-password',
    };
    controller.changePassword(user, dto);
    expect(auth.changePassword).toHaveBeenCalledWith('user-1', dto);
  });
});
