import { BadRequestException } from '@nestjs/common';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class MetricsPeriodDto {
  @IsOptional()
  @IsIn(['7', '30', '90', 'personalizado'])
  periodo?: '7' | '30' | '90' | 'personalizado';

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  inicio?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fim?: string;
}

export function metricsRange(dto: MetricsPeriodDto, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  let inicio: string;
  let fim: string;
  if (dto.periodo === 'personalizado') {
    if (!dto.inicio || !dto.fim)
      throw new BadRequestException(
        'Informe as duas datas do período personalizado.',
      );
    inicio = dto.inicio;
    fim = dto.fim;
  } else {
    const dias = Number(dto.periodo ?? '30');
    if (![7, 30, 90].includes(dias))
      throw new BadRequestException('Período inválido.');
    fim = today;
    inicio = new Date(
      new Date(`${today}T00:00:00Z`).getTime() - (dias - 1) * 86400000,
    )
      .toISOString()
      .slice(0, 10);
  }
  const start = new Date(`${inicio}T00:00:00Z`);
  const end = new Date(`${fim}T00:00:00Z`);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start.toISOString().slice(0, 10) !== inicio ||
    end.toISOString().slice(0, 10) !== fim ||
    inicio > fim ||
    fim > today ||
    (end.getTime() - start.getTime()) / 86400000 > 365
  ) {
    throw new BadRequestException(
      'Escolha um período válido de até 366 dias, sem datas futuras.',
    );
  }
  return { inicio, fim };
}
