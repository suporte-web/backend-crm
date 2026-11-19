import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';
export const ETAPAS_IMPORTACAO = ['entrada_leads', 'conversao', 'homologacao', 'cotacao', 'perdido'] as const;

export class PrepararImportacaoDto {
  @IsUUID() responsavelId: string;
  @IsOptional() @IsUUID() empresaConsultoraId?: string | null;
}
export class SelecionarLinhaImportacaoDto {
  @IsInt() @Min(2) numero: number;
  @IsIn(ETAPAS_IMPORTACAO) etapa: string;
  @IsOptional() @IsUUID() segmentoId?: string | null;
  @IsOptional() @IsBoolean() segmentoAutomatico?: boolean;
}
export class ConfirmarImportacaoDto {
  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(200)
  @ValidateNested({ each: true }) @Type(() => SelecionarLinhaImportacaoDto)
  linhas: SelecionarLinhaImportacaoDto[];
}
