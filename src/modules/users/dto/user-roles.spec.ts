import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
describe('User profile validation', () => {
  it('accepts Consultora when creating and editing users', async () => {
    const create = plainToInstance(CreateUserDto, { name: 'Maria', email: 'maria@example.test', role: 'CONSULTORA', password: 'Test-password-123' });
    const update = plainToInstance(UpdateUserDto, { role: 'CONSULTORA' });
    expect(await validate(create)).toEqual([]);
    expect(await validate(update)).toEqual([]);
  });
  it('accepts multiple profiles when creating a user', async () => {
    const dto = plainToInstance(CreateUserDto, { name: 'Maria', email: 'maria@example.com', roles: ['ADMIN', 'ATENDIMENTO', 'GESTAO'] });
    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
  });
  it('rejects an empty set of profiles on update', async () => {
    const dto = plainToInstance(UpdateUserDto, { roles: [] });
    expect((await validate(dto)).some((error) => error.property === 'roles')).toBe(true);
  });
  it('rejects an unknown profile', async () => {
    const dto = plainToInstance(UpdateUserDto, { roles: ['INVALID'] });
    expect((await validate(dto)).some((error) => error.property === 'roles')).toBe(true);
  });
});
