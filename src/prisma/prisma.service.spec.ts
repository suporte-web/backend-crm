import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

const config = {
  get: jest.fn((key: string) =>
    key === 'DATABASE_URL'
      ? 'postgresql://test:test@127.0.0.1:5432/crm_test'
      : undefined,
  ),
};

describe('PrismaService', () => {
  it('constrói o cliente com adaptador PostgreSQL e configuração injetada pelo Nest', async () => {
    const module = await Test.createTestingModule({ imports: [PrismaModule] })
      .overrideProvider(ConfigService)
      .useValue(config)
      .compile();
    const service = module.get(PrismaService);
    expect(typeof service.$connect).toBe('function');
    expect(typeof service.user.findUnique).toBe('function');
    expect(config.get).toHaveBeenCalledWith('DATABASE_URL');
    await module.close();
  });

  it.each([undefined, '', '   '])('rejeita DATABASE_URL ausente ou vazia (%p)', value => {
    expect(() => new PrismaService({ get: () => value } as unknown as ConfigService))
      .toThrow('DATABASE_URL deve estar definida no ambiente.');
  });

  it('conecta e desconecta nos eventos do ciclo de vida sem acessar banco no teste', async () => {
    const service = new PrismaService(config as unknown as ConfigService);
    const connect = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    const disconnect = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
    await service.onModuleInit();
    expect(connect).toHaveBeenCalledTimes(1);
    await service.onModuleDestroy();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
