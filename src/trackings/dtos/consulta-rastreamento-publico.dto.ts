import { Transform } from 'class-transformer';
import { IsEnum, IsString, Matches } from 'class-validator';
import { TrackingQueryType } from './query-tracking.dto';

export class ConsultaRastreamentoPublicoDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().replace(/[./\-\s]/g, '') : value)
  @IsString()
  @Matches(/^\d{14}$/)
  cnpj!: string;

  @IsEnum(TrackingQueryType)
  tipo: TrackingQueryType = TrackingQueryType.NRO_NF;
}
