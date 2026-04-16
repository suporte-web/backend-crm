import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RespondQuoteDto {
  @Type(() => Number)
  @IsNumber()
  price!: number;

  @IsOptional()
  @IsString()
  commercialNotes?: string;
}