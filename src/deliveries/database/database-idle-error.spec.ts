import { InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { EventEmitter } from 'node:events';
import { KmmDatabaseService } from './kmm-database.service';
import { PostgresDeliveriesService } from './postgres-deliveries.service';

const config = new ConfigService({
  KMM_DB_HOST: 'host-test', KMM_DB_PORT: '5432', KMM_DB_NAME: 'kmm-test', KMM_DB_USER: 'usuario-test', KMM_DB_PASSWORD: 'senha-ficticia',
  DB_HOST: 'host-test', DB_PORT: '5432', DB_NAME: 'ssw-test', DB_USER: 'usuario-test', DB_PASSWORD: 'senha-ficticia',
});

for (const [nome, Service] of [['KMM', KmmDatabaseService], ['Entregas/SSW', PostgresDeliveriesService]] as const) {
  describe(`Desconexao ociosa ${nome}`, () => {
    it('registra ECONNRESET sem encerrar o processo e permite nova consulta', async () => {
      const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      const service = new Service(config);
      const pool = (service as unknown as { pool: Pool }).pool;
      const query = jest.spyOn(pool, 'query').mockResolvedValue({ rows: [{ ok: true }] } as never);
      try {
        const error = Object.assign(new Error('Connection terminated unexpectedly'), { code: 'ECONNRESET' });
        expect(() => pool.emit('error', error)).not.toThrow();
        expect(log).toHaveBeenCalled();
        expect(await service.query('SELECT 1', [])).toEqual([{ ok: true }]);
      } finally { query.mockRestore(); await service.onModuleDestroy(); log.mockRestore(); }
    });
  });
}

describe('Conexao KMM reservada pela consulta otimizada', () => {
  it('trata ECONNRESET enquanto o cliente esta em uso e descarta a conexao', async () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const service = new KmmDatabaseService(config);
    const pool = (service as unknown as { pool: Pool }).pool;
    let eventHandled = false;
    const client = Object.assign(new EventEmitter(), { query: jest.fn(), release: jest.fn() });
    client.query.mockImplementation(async (sql: string) => {
      if (sql === 'SELECT 1') {
        const error = Object.assign(new Error('Conexao interrompida durante a consulta'), { code: 'ECONNRESET' });
        client.emit('error', error);
        eventHandled = true;
        throw error;
      }
      return { rows: [] };
    });
    const connect = jest.spyOn(pool, 'connect').mockResolvedValue(client as never);
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(service.query('SELECT 1', [], { preferBitmapScan: true })).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(eventHandled).toBe(true);
      expect(client.release).toHaveBeenCalledWith(true);
      expect(client.listenerCount('error')).toBe(0);
    } finally { connect.mockRestore(); await service.onModuleDestroy(); log.mockRestore(); errorLog.mockRestore(); }
  });
});
