// dto/query-tracking.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum TrackingQueryType {
  NRO_NF = 'nro_nf',
  PEDIDO = 'pedido',
  CHAVE_NFE = 'chave_nfe',
  NRO_COLETA = 'nro_coleta',
}

export class QueryTrackingDto {
  @ApiProperty({
    example: '02012862003770',
    description: 'CNPJ do destinatário da carga',
  })
  @IsString()
  @IsNotEmpty()
  cnpj!: string;

  @ApiPropertyOptional({
    example: 'SWORDFISH',
    description: 'Senha de acesso ao rastreamento, quando exigida',
  })
  @IsOptional()
  @IsString()
  senha?: string;

  @ApiPropertyOptional({
    example: 'ABC',
    description: 'Sigla da empresa para filtrar o rastreamento',
  })
  @IsOptional()
  @IsString()
  siglaEmp?: string;

  @ApiProperty({
    enum: TrackingQueryType,
    example: TrackingQueryType.PEDIDO,
    description: 'Tipo de consulta a ser feita na SSW',
  })
  @IsEnum(TrackingQueryType)
  tipoConsulta!: TrackingQueryType;

  @ApiProperty({
    example: '12345678',
    description: 'Valor da consulta conforme o tipo escolhido',
  })
  @IsString()
  @IsNotEmpty()
  valor!: string;
}