import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RespondQuoteDto {
  @ApiProperty({ description: 'Valor respondido pela equipe comercial em reais.' })
  @Type(() => Number)
  @IsNumber()
  price!: number;

  @ApiPropertyOptional({ description: 'Observações comerciais enviadas ao cliente.' })
  @IsOptional()
  @IsString()
  commercialNotes?: string;
}
