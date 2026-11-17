import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class DirecionarCotacaoSiteDto {
  @IsUUID()
  responsavelId!: string;
}

export class AtualizarCotacaoSiteDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(250)
  nome?: string;
  @IsOptional() @IsString() @MaxLength(250)
  empresa?: string;
  @IsOptional() @IsEmail() @MaxLength(250)
  email?: string;
  @IsOptional() @IsString() @MaxLength(50)
  telefone?: string;
  @IsOptional() @IsString() @MaxLength(30)
  cnpj?: string;
  @IsOptional() @IsString() @MaxLength(250)
  cidade?: string;
  @IsOptional() @IsString() @MaxLength(250)
  solucao?: string;
  @IsOptional() @IsString() @MaxLength(10000)
  observacaoInterna?: string;
}

export class ConverterCotacaoSiteClienteDto {
  @IsString() @MinLength(1) @MaxLength(30)
  document!: string;
}
