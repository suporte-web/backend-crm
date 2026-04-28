import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class UpdatePropostaDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  descricaoServico?: string;

  @IsOptional()
  @IsString()
  origem?: string;

  @IsOptional()
  @IsString()
  destino?: string;

  @IsOptional()
  @IsNumber()
  valor?: number;

  @IsOptional()
  @IsString()
  condicoesPagamento?: string;

  @IsOptional()
  @IsString()
  condicoesComerciais?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  validadeDias?: number;

  @IsOptional()
  @IsDateString()
  validaAte?: string;
}
