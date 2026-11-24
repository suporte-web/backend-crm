import { EntregasPorPlacasService } from './entregas-por-placas.service';
import { buildCtrcsSswPorNfQuery, buildEventosOperacaoMonitoramentoKmmQuery } from './sql/monitoramento-kmm-ssw.sql';
import { listarAliasesPlacasMonitoramento } from './config/placas-monitoramento.config';
import type { KmmDatabaseService } from '../deliveries/database/kmm-database.service';
import type { PostgresDeliveriesService } from '../deliveries/database/postgres-deliveries.service';

describe('Monitoramento de placas - mesmos filtros e resultados', () => {
  function calcular(documentos: Array<number | null>, registros: Array<{ nf: number; previsao: string | null; entregue?: boolean }>) {
    const service = new EntregasPorPlacasService({} as PostgresDeliveriesService, {} as KmmDatabaseService);
    const porNf = new Map<number, unknown[]>();
    registros.forEach((registro, index) => {
      const rows = porNf.get(registro.nf) ?? [];
      rows.push({ seq_ctrc: index, data_prev_ent: registro.previsao, data_entrega: registro.entregue ? '2026-11-24' : null });
      porNf.set(registro.nf, rows);
    });
    const rota = {
      placa: 'ABC1D23', romaneio: '123', nomeMotorista: 'Motorista', dataInclusao: '2026-11-24', horaInclusao: '08:00',
      documentos: new Map(documentos.map((nfMinima, index) => [String(index), { conhecimentoId: String(index), nfMinima }])),
    };
    return (service as unknown as { montarLinhaRota(rota: unknown, ctrcs: Map<number, unknown[]>, data: string): { data_prev_ent: string | null; pendentes_sem_previsao: number; entregues: number; faltam: number } }).montarLinhaRota(rota, porNf, '2026-11-24');
  }

  it('retorna a menor previsão somente dos documentos pendentes', () => {
    expect(calcular([1, 2, 3], [
      { nf: 1, previsao: '2026-11-20', entregue: true },
      { nf: 2, previsao: '2026-11-26' },
      { nf: 3, previsao: '2026-11-25' },
    ])).toMatchObject({ data_prev_ent: '2026-11-25', entregues: 1, faltam: 2, pendentes_sem_previsao: 0 });
  });

  it('mantém previsão vencida sem trocá-la pela data do monitoramento', () => {
    expect(calcular([1], [{ nf: 1, previsao: '2026-11-22' }]).data_prev_ent).toBe('2026-11-22');
  });

  it('não fabrica previsão para documento sem NF, sem vínculo SSW ou sem data', () => {
    const logger = jest.spyOn(require('@nestjs/common').Logger.prototype, 'warn').mockImplementation(() => {});
    try {
      expect(calcular([null, 1, 2], [{ nf: 1, previsao: null }])).toMatchObject({ data_prev_ent: null, pendentes_sem_previsao: 3, faltam: 3 });
    } finally { logger.mockRestore(); }
  });

  it('retorna sem previsão pendente quando todas as entregas já foram realizadas', () => {
    expect(calcular([1], [{ nf: 1, previsao: '2026-11-25', entregue: true }])).toMatchObject({ data_prev_ent: null, pendentes_sem_previsao: 0, faltam: 0 });
  });

  it('respeita a contagem existente por documento quando a NF tem vários CTRCs', () => {
    expect(calcular([1, 2], [
      { nf: 1, previsao: '2026-11-20', entregue: true },
      { nf: 1, previsao: '2026-11-21' },
      { nf: 2, previsao: '2026-11-27' },
      { nf: 2, previsao: '2026-11-26' },
    ])).toMatchObject({ data_prev_ent: '2026-11-26', entregues: 1, faltam: 1 });
  });

  it('ignora datas inválidas sem deslocar dias por fuso horário', () => {
    expect(calcular([1, 2], [{ nf: 1, previsao: '2026-02-31' }, { nf: 2, previsao: '2026-12-01' }])).toMatchObject({ data_prev_ent: '2026-12-01', pendentes_sem_previsao: 1 });
  });

  it('inclui a previsão SSW na consulta externa mantendo os parâmetros de NF', () => {
    const query = buildCtrcsSswPorNfQuery([123, 456]);
    expect(query.text).toContain("to_char(ctrc.data_prev_ent, 'YYYY-MM-DD') as data_prev_ent");
    expect(query.text.split('from (')[0]).toContain('data_prev_ent');
    expect(query.values).toEqual([123, 456]);
  });
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
