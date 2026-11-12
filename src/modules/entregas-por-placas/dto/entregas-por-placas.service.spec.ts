import { EntregasPorPlacasService } from './entregas-por-placas.service';
import { buildEventosOperacaoMonitoramentoKmmQuery } from '../sql/monitoramento-kmm-ssw.sql';
import { listarAliasesPlacasMonitoramento } from '../config/placas-monitoramento.config';
import type { KmmDatabaseService } from '../../deliveries/database/kmm-database.service';
import type { PostgresDeliveriesService } from '../../deliveries/database/postgres-deliveries.service';

describe('Monitoramento de placas - mesmos filtros e resultados', () => {
  it('aplica a estrategia de leitura somente na busca de eventos mantendo a SQL e parametros', async () => {
    const rows = [{ romaneio: 'r1', controle_evo_id: 'e1', placa: 'ABC1D23', data_evento: '2026-11-09', cod_pessoa: 'p1', num_evento: 1 }];
    const query = jest.fn().mockResolvedValue(rows);
    const service = new EntregasPorPlacasService({} as PostgresDeliveriesService, { query } as unknown as KmmDatabaseService);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const result = await (service as unknown as { buscarEventosDiaKmm(data: string): Promise<unknown[]> }).buscarEventosDiaKmm('2026-11-09');
      const expected = buildEventosOperacaoMonitoramentoKmmQuery('2026-11-09', listarAliasesPlacasMonitoramento());
      expect(query).toHaveBeenCalledWith(expected.text, expected.values, { preferBitmapScan: true });
      expect(result).toEqual(rows);
    } finally { log.mockRestore(); }
  });
});
