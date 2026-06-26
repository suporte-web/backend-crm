import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export class QueryDeliveriesDto {
  @ApiPropertyOptional({
    description: 'Data de referencia da entrega no formato YYYY-MM-DD',
    example: '2026-04-24',
  })
  @IsOptional()
  @Matches(DATE_FORMAT)
  dataRef?: string;

  @ApiPropertyOptional({
    description: 'Alias para dataRef no formato YYYY-MM-DD',
    example: '2026-04-24',
  })
  @IsOptional()
  @Matches(DATE_FORMAT)
  data?: string;

  @ApiPropertyOptional({
    description: 'Data inicial do periodo no formato YYYY-MM-DD',
    example: '2026-04-01',
  })
  @IsOptional()
  @Matches(DATE_FORMAT)
  dataInicio?: string;

  @ApiPropertyOptional({
    description: 'Data final do periodo no formato YYYY-MM-DD',
    example: '2026-04-30',
  })
  @IsOptional()
  @Matches(DATE_FORMAT)
  dataFim?: string;

  @ApiPropertyOptional({
    description: 'Alias para dataInicio no formato YYYY-MM-DD',
    example: '2026-04-01',
  })
  @IsOptional()
  @Matches(DATE_FORMAT)
  dataInicial?: string;

  @ApiPropertyOptional({
    description: 'Alias para dataFim no formato YYYY-MM-DD',
    example: '2026-04-30',
  })
  @IsOptional()
  @Matches(DATE_FORMAT)
  dataFinal?: string;

  @ApiPropertyOptional({
    description: 'UF de destino',
    example: 'PR',
  })
  @IsOptional()
  @IsString()
  ufDest?: string;

  @ApiPropertyOptional({
    description: 'Alias para UF de destino',
    example: 'PR',
  })
  @IsOptional()
  @IsString()
  uf?: string;

  @ApiPropertyOptional({
    description: 'Cidade de destino',
    example: 'Curitiba',
  })
  @IsOptional()
  @IsString()
  cidadeDest?: string;

  @ApiPropertyOptional({
    description: 'Alias para cidade de destino',
    example: 'Curitiba',
  })
  @IsOptional()
  @IsString()
  cidade?: string;

  @ApiPropertyOptional({
    description: 'Numero do CTRC para busca parcial',
    example: '12345',
  })
  @IsOptional()
  @IsString()
  nroCtrc?: string;

  @ApiPropertyOptional({
    description: 'Status operacional da entrega',
    enum: ['Todos', 'Entregue', 'Pendente', 'Em atraso'],
  })
  @IsOptional()
  @IsIn(['Todos', 'Entregue', 'Pendente', 'Em atraso'])
  statusEntrega?: string;

  @ApiPropertyOptional({
    description: 'Classificacao operacional da rota',
    example: 'Curitiba',
  })
  @IsOptional()
  @IsString()
  classificacaoRota?: string;

  @ApiPropertyOptional({
    description: 'Pagina da listagem',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por pagina',
    example: 100,
    default: 100,
    maximum: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
