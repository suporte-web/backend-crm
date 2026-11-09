import { Logger } from '@nestjs/common';
import { EntregasPorPlacasService } from './entregas-por-placas.service';
import type { KmmDatabaseService } from '../../deliveries/database/kmm-database.service';
import type { PostgresDeliveriesService } from '../../deliveries/database/postgres-deliveries.service';

describe('Monitoramento - consultas simultaneas', () => {
  let service: EntregasPorPlacasService;
  let query: jest.Mock;
  let output: jest.SpyInstance;
  let errors: jest.SpyInstance;
  let logger: jest.SpyInstance;
  beforeEach(() => {
    query = jest.fn().mockResolvedValue([]);
    service = new EntregasPorPlacasService({ query: jest.fn().mockResolvedValue([]) } as unknown as PostgresDeliveriesService, { query } as unknown as KmmDatabaseService);
    output = jest.spyOn(console, 'log').mockImplementation(() => {});
    errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => { output.mockRestore(); errors.mockRestore(); logger.mockRestore(); });
  it('compartilha uma consulta em andamento para os mesmos filtros', async () => {
    let resolve!: (rows: unknown[]) => void;
    query.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const first = service.buscarMonitoramento({ data: '2026-11-09' });
    const second = service.buscarMonitoramento({ data: '2026-11-09' });
    try { expect(query).toHaveBeenCalledTimes(1); }
    finally { resolve([]); }
    const results = await Promise.all([first, second]);
    expect(results[0]).toEqual(results[1]);
  });
  it('mantem filtros diferentes em consultas independentes', async () => {
    let resolve!: (rows: unknown[]) => void;
    query.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const first = service.buscarMonitoramento({ data: '2026-11-09', motorista: 'A' });
    const second = service.buscarMonitoramento({ data: '2026-11-09', motorista: 'B' });
    try { expect(query).toHaveBeenCalledTimes(2); }
    finally { resolve([]); }
    await Promise.all([first, second]);
  });
  it('consulta a base novamente em cada atualizacao apos concluir', async () => {
    await service.buscarMonitoramento({ data: '2026-11-09' });
    const previous = query.mock.calls.length;
    await service.buscarMonitoramento({ data: '2026-11-09' });
    expect(query.mock.calls.length).toBeGreaterThan(previous);
  });
  it('permite nova tentativa depois de falha', async () => {
    query.mockRejectedValueOnce(new Error('Falha simulada'));
    await expect(service.buscarMonitoramento({ data: '2026-11-09' })).rejects.toThrow();
    await expect(service.buscarMonitoramento({ data: '2026-11-09' })).resolves.toMatchObject({ success: true });
  });
});
