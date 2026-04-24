import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class QueryDeliveriesDto {
  @ApiPropertyOptional({
    description: 'Data de referencia da entrega no formato YYYY-MM-DD',
    example: '2026-04-24',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataRef?: string;

  @ApiPropertyOptional({
    description: 'UF de destino',
    example: 'PR',
  })
  @IsOptional()
  @IsString()
  ufDest?: string;

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
}
