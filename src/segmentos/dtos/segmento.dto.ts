import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, Length, Matches, ValidateIf, IsUrl } from 'class-validator';

export class DadosSegmentoDto {
  @IsOptional() @IsUUID()
  segmentoId?: string | null;
  @IsOptional() @IsBoolean()
  segmentoAutomatico?: boolean;
  @IsOptional() @ValidateIf((_objeto, valor) => valor !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  siteUrl?: string | null;
}

export class CriarSegmentoDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(2, 100)
  nome: string;
  @IsOptional() @IsArray() @IsString({ each: true })
  aliases?: string[];
}

export class SalvarRegraCnaeDto {
  @Matches(/^(?:\d{2}|\d{3}|\d{5}|\d{7})$/)
  prefixo: string;
  @IsUUID()
  segmentoId: string;
  @IsOptional() @IsBoolean()
  ativa?: boolean;
}
