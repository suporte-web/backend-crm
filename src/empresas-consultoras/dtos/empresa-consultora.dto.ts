import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsBoolean, IsOptional, IsString, IsUUID, Length, Matches, ValidateIf } from 'class-validator';

export class CriarEmpresaConsultoraDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(2, 160)
  nome: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.replace(/[./\-\s]/g, '') || null : value)
  @Matches(/^\d{14}$/, { message: 'Informe o CNPJ com 14 dígitos.' })
  cnpj?: string | null;
}

export class AtualizarEmpresaConsultoraDto {
  @ValidateIf((_objeto, valor) => valor !== undefined)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(2, 160)
  nome?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.replace(/[./\-\s]/g, '') || null : value)
  @Matches(/^\d{14}$/, { message: 'Informe o CNPJ com 14 dígitos.' })
  cnpj?: string | null;

  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsBoolean()
  ativa?: boolean;
}

export class VincularUsuarioEmpresaDto {
  @IsBoolean()
  vincular: boolean;
}

export class VincularCarteiraEmpresaDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  cadastroIds: string[];

  @IsOptional()
  @IsBoolean()
  aplicar?: boolean;
}

export class TransferirCadastroEmpresaDto {
  @IsOptional()
  @IsUUID()
  empresaConsultoraId?: string | null;
}
