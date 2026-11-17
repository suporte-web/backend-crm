import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CriarSolicitacaoSiteDto {
  @IsString()
  @IsIn([
  'COTACAO',
  'AGREGADO',
  'FORNECEDOR',
  'FROTA',
  'MARKETING',
  'FINANCEIRO',
  'JURIDICO',
  'FISCAL',
])
tipo: string;


  @IsString()
  nome: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsString()
  empresa?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  solucao?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  categoriaCnh?: string;

  @IsOptional()
  @IsBoolean()
  possuiMopp?: boolean;

  @IsOptional()
  @IsBoolean()
  possuiEar?: boolean;

  @IsOptional()
  @IsString()
  marcaVeiculo?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  anoVeiculo?: number;

  @IsOptional()
  @IsString()
  assunto?: string;

  @IsOptional()
  @IsString()
  mensagem?: string;

  @IsOptional()
  @IsBoolean()
  aceitePrivacidade?: boolean;

  @IsOptional()
  @IsBoolean()
  aceiteComunicacoes?: boolean;
}