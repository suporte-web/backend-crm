import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../enums/user-role.enum';
describe('RolesGuard multiple profiles', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new RolesGuard(reflector as unknown as Reflector);
  function context(user: object): ExecutionContext {
    return { getHandler: () => undefined, getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }
  it('allows access granted by an additional profile', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ATENDIMENTO]);
    expect(guard.canActivate(context({ role: UserRole.GESTAO, roles: [UserRole.GESTAO, UserRole.ATENDIMENTO] }))).toBe(true);
  });
  it('keeps access for users with a legacy single profile', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.GESTAO]);
    expect(guard.canActivate(context({ role: UserRole.GESTAO }))).toBe(true);
  });
  it('recognizes the Gestão profile stored in the database', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.GESTAO]);
    expect(guard.canActivate(context({ role: 'GESTAO', roles: ['GESTAO'] }))).toBe(true);
  });
  it('rejects access when none of the profiles grants it', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(() => guard.canActivate(context({ role: UserRole.GESTAO, roles: [UserRole.GESTAO, UserRole.ATENDIMENTO] }))).toThrow(ForbiddenException);
  });
});
