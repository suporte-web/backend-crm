import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { KmmDatabaseService } from './kmm-database.service';

jest.mock('pg', () => ({ Pool: jest.fn() }));

describe('KmmDatabaseService - plano isolado de monitoramento', () => {
  const rows = [{ romaneio: '1', controle_evo_id: '2' }];
  let service: KmmDatabaseService;
  let pool: { query: jest.Mock; connect: jest.Mock; end: jest.Mock; on: jest.Mock };
  let client: { query: jest.Mock; release: jest.Mock; on: jest.Mock; removeListener: jest.Mock };
  let log: jest.SpyInstance;
  beforeEach(() => {
    client = { query: jest.fn().mockResolvedValue({ rows }), release: jest.fn(), on: jest.fn(), removeListener: jest.fn() };
    pool = { query: jest.fn().mockResolvedValue({ rows }), connect: jest.fn().mockResolvedValue(client), end: jest.fn(), on: jest.fn() };
    (Pool as unknown as jest.Mock).mockImplementation(() => pool);
    service = new KmmDatabaseService(new ConfigService({ KMM_DB_HOST: 'host-test', KMM_DB_PORT: '5432', KMM_DB_NAME: 'base-test', KMM_DB_USER: 'usuario-test', KMM_DB_PASSWORD: 'senha-ficticia' }));
    log = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => log.mockRestore());
  function optimized() {
    return (service.query as unknown as (text: string, values: string[], options: { preferBitmapScan: boolean }) => Promise<unknown[]>)(
      'SELECT dados FROM exemplo WHERE placa=$1', ['ABC1D23'], { preferBitmapScan: true },
    );
  }
  it('preserva consultas normais sem transacao nem configuracao adicional', async () => {
    expect(await service.query('SELECT 1', [])).toEqual(rows);
    expect(pool.query).toHaveBeenCalledWith('SELECT 1', []);
    expect(pool.connect).not.toHaveBeenCalled();
  });
  it('executa a mesma SQL e parametros em transacao somente leitura com ajuste local', async () => {
    expect(await optimized()).toEqual(rows);
    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(client.query.mock.calls).toEqual([
      ['BEGIN READ ONLY'], ['SET LOCAL enable_indexscan = off'],
      ['SELECT dados FROM exemplo WHERE placa=$1', ['ABC1D23']], ['COMMIT'],
    ]);
    expect(client.release).toHaveBeenCalledWith();
    expect(pool.query).not.toHaveBeenCalled();
  });
  it('desfaz a transacao e libera a conexao quando a consulta falha', async () => {
    client.query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT')) throw new Error('Erro simulado');
      return { rows };
    });
    await expect(optimized()).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledWith();
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
  });
  it('descarta a conexao se nao conseguir limpar a transacao', async () => {
    client.query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT') || sql === 'ROLLBACK') throw new Error('Conexao interrompida');
      return { rows };
    });
    await expect(optimized()).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(client.release).toHaveBeenCalledWith(true);
  });
});
