import { QuoteStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateQuoteStatusDto {
  @ApiProperty({ enum: QuoteStatus, description: 'Novo status da cotacao.' })
  @IsEnum(QuoteStatus)
  status!: QuoteStatus;

  @ApiPropertyOptional({ description: 'Observacao opcional para registrar no historico.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
