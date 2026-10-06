import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../enums/user-role.enum';
describe('JWT current profiles', () => {
  it('uses current database profiles instead of outdated token profiles', async () => {
    const users = { findOne: jest.fn().mockResolvedValue({ id: '1', email: 'test@example.test', role: 'GESTAO', roles: ['GESTAO', 'ATENDIMENTO'], isActive: true }) };
    const strategy = new JwtStrategy(new ConfigService({ JWT_SECRET: 'test-only-secret' }), users as unknown as UsersService);
    expect(await strategy.validate({ sub: '1', email: 'test@example.test', role: UserRole.ADMIN })).toEqual({ sub: '1', email: 'test@example.test', role: 'GESTAO', roles: ['GESTAO', 'ATENDIMENTO'] });
  });
  it('rejects an inactive user even when the token is valid', async () => {
    const users = { findOne: jest.fn().mockResolvedValue({ id: '1', role: 'ADMIN', isActive: false }) };
    const strategy = new JwtStrategy(new ConfigService({ JWT_SECRET: 'test-only-secret' }), users as unknown as UsersService);
    await expect(strategy.validate({ sub: '1', email: 'test@example.test', role: UserRole.ADMIN })).rejects.toThrow(UnauthorizedException);
  });
});
