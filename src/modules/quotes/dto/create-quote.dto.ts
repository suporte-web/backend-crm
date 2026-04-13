import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateQuoteDto {
  @IsString()
  origin!: string;

  @IsString()
  destination!: string;

  @IsString()
  serviceType!: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsNumber()
  volume?: number;

  @IsOptional()
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsString()
  desiredDeadline?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}