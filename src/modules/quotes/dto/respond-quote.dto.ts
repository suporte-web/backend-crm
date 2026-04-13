import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RespondQuoteDto {
  @IsNumber()
  price!: number;

  @IsOptional()
  @IsString()
  commercialNotes?: string;
}