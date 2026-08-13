import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export class ConsultarMonitoramentoEntregasPorPlacasDto {
  @ApiPropertyOptional({
    description: 'Dia de inclusao do romaneio no formato YYYY-MM-DD.',
    example: '2026-08-04',
  })
  @IsOptional()
  @Matches(DATE_FORMAT)
  data?: string;

  @ApiPropertyOptional({
    description: 'Filtro opcional por placa do cavalo ou carreta.',
    example: 'ABC1D23',
  })
  @IsOptional()
  @IsString()
  placa?: string;

  @ApiPropertyOptional({
    description: 'Filtro opcional por nome do motorista.',
    example: 'Joao',
  })
  @IsOptional()
  @IsString()
  motorista?: string;
}
