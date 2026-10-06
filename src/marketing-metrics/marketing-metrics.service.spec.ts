import { metricsRange } from './dto/metrics-period.dto';
import { MarketingMetricsService } from './marketing-metrics.service';
import type { GoogleAnalyticsService } from '../marketing-integrations/google-analytics.service';
import type {
  GoogleReport,
  ReportQuery,
} from '../marketing-integrations/google-api.types';

describe('Marketing metrics', () => {
  const now = new Date('2026-10-01T15:00:00Z');
  it('includes exactly 7/30/90 days in the Sao Paulo calendar', () => {
    expect(metricsRange({ periodo: '7' }, now)).toEqual({
      inicio: '2026-09-25',
      fim: '2026-10-01',
    });
    expect(metricsRange({ periodo: '30' }, now)).toEqual({
      inicio: '2026-09-02',
      fim: '2026-10-01',
    });
    expect(metricsRange({ periodo: '90' }, now)).toEqual({
      inicio: '2026-07-04',
      fim: '2026-10-01',
    });
    expect(
      metricsRange({ periodo: '7' }, new Date('2026-10-02T01:00:00Z')).fim,
    ).toBe('2026-10-01');
  });

  it.each([
    { periodo: 'personalizado' as const },
    {
      periodo: 'personalizado' as const,
      inicio: '2026-02-30',
      fim: '2026-03-02',
    },
    {
      periodo: 'personalizado' as const,
      inicio: '2026-10-01',
      fim: '2026-09-01',
    },
    {
      periodo: 'personalizado' as const,
      inicio: '2026-09-01',
      fim: '2026-10-02',
    },
  ])('rejects invalid custom range %j', (dto) => {
    expect(() => metricsRange(dto, now)).toThrow();
  });

  it('uses separate aggregate totals, orders real daily reports and fills missing dates with zero', async () => {
    const report = jest
      .fn<Promise<GoogleReport>, [ReportQuery]>()
      .mockResolvedValueOnce({
        metricHeaders: [{ name: 'totalUsers' }, { name: 'sessions' }],
        rows: [{ metricValues: [{ value: '10' }, { value: '20' }] }],
        metadata: {
          timeZone: 'America/Sao_Paulo',
          subjectToThresholding: true,
        },
      })
      .mockResolvedValueOnce({
        dimensionHeaders: [{ name: 'date' }],
        metricHeaders: [{ name: 'totalUsers' }, { name: 'sessions' }],
        rows: [
          {
            dimensionValues: [{ value: '20260925' }],
            metricValues: [{ value: '8' }, { value: '12' }],
          },
          {
            dimensionValues: [{ value: '20260927' }],
            metricValues: [{ value: '8' }, { value: '8' }],
          },
        ],
      });
    const service = new MarketingMetricsService({
      report,
    } as unknown as GoogleAnalyticsService);
    const result = await service.resumo({
      periodo: 'personalizado',
      inicio: '2026-09-25',
      fim: '2026-09-27',
    });
    expect(result.totais.usuarios).toBe(10);
    expect(result.totais.sessoes).toBe(20);
    expect(result.acessos).toHaveLength(3);
    expect(result.acessos[1]).toEqual({
      data: '2026-09-26',
      usuarios: 0,
      sessoes: 0,
      visualizacoes: 0,
    });
    expect(result.dadosLimitados).toBe(true);
    expect(
      report.mock.calls[0][0].metrics.map((metric) => metric.name),
    ).toContain('keyEvents');
  });
});
