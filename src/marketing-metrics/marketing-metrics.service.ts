import { Injectable } from '@nestjs/common';
import { GoogleAnalyticsService } from '../marketing-integrations/google-analytics.service';
import type {
  GoogleReport,
  ReportQuery,
} from '../marketing-integrations/google-api.types';
import { MetricsPeriodDto, metricsRange } from './dto/metrics-period.dto';

export function reportRows(report: GoogleReport) {
  return (report.rows ?? []).map((row) => ({
    dimensions: Object.fromEntries(
      (report.dimensionHeaders ?? []).map((header, index) => [
        header.name,
        row.dimensionValues?.[index]?.value ?? '',
      ]),
    ),
    metrics: Object.fromEntries(
      (report.metricHeaders ?? []).map((header, index) => {
        const value = Number(row.metricValues?.[index]?.value ?? 0);
        return [header.name, Number.isFinite(value) ? value : 0];
      }),
    ),
  }));
}

@Injectable()
export class MarketingMetricsService {
  constructor(private readonly analytics: GoogleAnalyticsService) {}

  private query(
    dto: MetricsPeriodDto,
    metrics: string[],
    dimensions: string[] = [],
    limit = 20,
  ): ReportQuery {
    const range = metricsRange(dto);
    return {
      dateRanges: [{ startDate: range.inicio, endDate: range.fim }],
      metrics: metrics.map((name) => ({ name })),
      dimensions: dimensions.map((name) => ({ name })),
      limit,
    };
  }

  async resumo(dto: MetricsPeriodDto) {
    const periodo = metricsRange(dto);
    const metrics = [
      'totalUsers',
      'sessions',
      'screenPageViews',
      'newUsers',
      'keyEvents',
      'eventCount',
    ];
    const [summary, daily] = await Promise.all([
      this.analytics.report(this.query(dto, metrics, [], 1)),
      this.analytics.report({
        ...this.query(
          dto,
          ['totalUsers', 'sessions', 'screenPageViews'],
          ['date'],
          366,
        ),
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
    ]);
    const totals = reportRows(summary)[0]?.metrics ?? {};
    const byDate = new Map(
      reportRows(daily).map((row) => [row.dimensions.date, row.metrics]),
    );
    const acessos: {
      data: string;
      usuarios: number;
      sessoes: number;
      visualizacoes: number;
    }[] = [];
    for (
      let date = new Date(`${periodo.inicio}T00:00:00Z`);
      date.toISOString().slice(0, 10) <= periodo.fim;
      date = new Date(date.getTime() + 86400000)
    ) {
      const day = date.toISOString().slice(0, 10);
      const values = byDate.get(day.replace(/-/g, '')) ?? {};
      acessos.push({
        data: day,
        usuarios: values.totalUsers ?? 0,
        sessoes: values.sessions ?? 0,
        visualizacoes: values.screenPageViews ?? 0,
      });
    }
    return {
      periodo,
      totais: {
        usuarios: totals.totalUsers ?? 0,
        sessoes: totals.sessions ?? 0,
        visualizacoes: totals.screenPageViews ?? 0,
        novosUsuarios: totals.newUsers ?? 0,
        conversoes: totals.keyEvents ?? 0,
        eventos: totals.eventCount ?? 0,
      },
      acessos,
      fusoHorario:
        summary.metadata?.timeZone ?? daily.metadata?.timeZone ?? null,
      dadosLimitados: Boolean(
        summary.metadata?.subjectToThresholding ||
        daily.metadata?.subjectToThresholding ||
        summary.metadata?.dataLossFromOtherRow ||
        daily.metadata?.dataLossFromOtherRow,
      ),
    };
  }

  async trafego(dto: MetricsPeriodDto) {
    const report = await this.analytics.report({
      ...this.query(
        dto,
        ['sessions', 'totalUsers'],
        ['sessionSourceMedium', 'sessionDefaultChannelGroup'],
      ),
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    });
    return reportRows(report).map((row) => ({
      origem: row.dimensions.sessionSourceMedium,
      canal: row.dimensions.sessionDefaultChannelGroup,
      sessoes: row.metrics.sessions,
      usuarios: row.metrics.totalUsers,
    }));
  }

  async paginas(dto: MetricsPeriodDto) {
    const report = await this.analytics.report({
      ...this.query(
        dto,
        ['screenPageViews', 'totalUsers'],
        ['pagePathPlusQueryString', 'pageTitle'],
      ),
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    });
    return reportRows(report).map((row) => ({
      pagina: row.dimensions.pagePathPlusQueryString,
      titulo: row.dimensions.pageTitle,
      visualizacoes: row.metrics.screenPageViews,
      usuarios: row.metrics.totalUsers,
    }));
  }

  async eventos(dto: MetricsPeriodDto) {
    const report = await this.analytics.report({
      ...this.query(dto, ['eventCount', 'keyEvents'], ['eventName']),
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    });
    return reportRows(report).map((row) => ({
      evento: row.dimensions.eventName,
      quantidade: row.metrics.eventCount,
      conversoes: row.metrics.keyEvents,
    }));
  }
}
