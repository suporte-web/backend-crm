import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateQuoteDto {
  @IsString()
  origin!: string;

  @IsString()
  destination!: string;

  @IsString()
  serviceType!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  volume?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsString()
  desiredDeadline?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}