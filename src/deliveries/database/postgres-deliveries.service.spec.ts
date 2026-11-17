import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PostgresDeliveriesService } from './postgres-deliveries.service';

describe('TLS do banco de entregas', () => {
  it.each([
    ['true', { rejectUnauthorized: true }],
    ['false', undefined],
    [undefined, undefined],
  ])('configura a conexão com DB_SSL=%s', async (ssl, expected) => {
    const service = new PostgresDeliveriesService(new ConfigService({
      DB_HOST: 'host-test', DB_PORT: '5432', DB_NAME: 'base-test',
      DB_USER: 'usuario-test', DB_PASSWORD: 'senha-ficticia', DB_SSL: ssl,
    }));
    const pool = (service as unknown as { pool: Pool }).pool;
    try {
      expect(pool.options.ssl).toEqual(expected);
    } finally {
      await service.onModuleDestroy();
    }
  });
});
