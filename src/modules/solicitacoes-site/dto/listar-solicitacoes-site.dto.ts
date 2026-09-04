import { IsOptional, IsString } from 'class-validator';

export class ListarSolicitacoesSiteDto {
  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  excluirTipo?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsString()
  busca?: string;
}
