import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDefined,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateQuoteDto {
  @ApiProperty({ description: 'Cidade ou ponto de origem da cotacao.' })
  @IsString()
  origin!: string;

  @ApiProperty({ description: 'Cidade ou ponto de destino da cotacao.' })
  @IsString()
  destination!: string;

  @ApiProperty({ description: 'Tipo de servico solicitado.' })
  @IsString()
  serviceType!: string;

  @ApiPropertyOptional({ description: 'Modalidade da solicitacao, como avulsa ou contrato.' })
  @IsOptional()
  @IsString()
  requestType?: string;

  @ApiPropertyOptional({ description: 'Endereco ou ponto de coleta.' })
  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @ApiPropertyOptional({ description: 'Endereco ou ponto de entrega.' })
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Descricao da carga, mercadoria ou servico.' })
  @IsOptional()
  @IsString()
  cargoDescription?: string;

  @ApiPropertyOptional({ description: 'Nome do contato responsavel.' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Telefone do contato responsavel.' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'E-mail do contato responsavel.' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Peso estimado da carga em quilogramas.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: 'Volume estimado da carga em metros cubicos.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  volume?: number;

  @ApiPropertyOptional({ description: 'Quantidade de volumes ou itens.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  quantity?: number;

  @ApiProperty({ description: 'Valor da mercadoria em reais.' })
  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  merchandiseValue!: number;

  @ApiPropertyOptional({ description: 'Prazo desejado para atendimento ou entrega.' })
  @IsOptional()
  @IsString()
  desiredDeadline?: string;

  @ApiPropertyOptional({ description: 'Observacoes adicionais da solicitacao.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
