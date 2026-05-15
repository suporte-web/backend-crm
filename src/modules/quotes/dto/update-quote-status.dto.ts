import { QuoteStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateQuoteStatusDto {
  @ApiProperty({ enum: QuoteStatus, description: 'Novo status da cotação.' })
  @IsEnum(QuoteStatus)
  status!: QuoteStatus;

  @ApiPropertyOptional({ description: 'Observação opcional para registrar no histórico.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
