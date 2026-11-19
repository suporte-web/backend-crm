import { IsEmail, IsOptional, IsString } from 'class-validator';
import { DadosSegmentoDto } from '../../segmentos/dtos/segmento.dto';

export class UpdateLeadDto extends DadosSegmentoDto {
  @IsOptional() @IsString()
  cnae?: string;
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsString()
  transport?: string;

  @IsOptional()
  @IsString()
  storage?: string;

  @IsOptional()
  @IsString()
  entryDate?: string;

  @IsOptional()
  @IsString()
  lastInteractionDate?: string;

  @IsOptional()
  @IsString()
  monthlyEstimatedValue?: string;

  @IsOptional()
  @IsString()
  responsible?: string;

  @IsOptional()
  @IsString()
  currentStatus?: string;

  @IsOptional()
  @IsString()
  nextAction?: string;
}
