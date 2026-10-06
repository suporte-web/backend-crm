import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { StatusAtendimentoSac } from '@prisma/client';
const limpar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class FiltroSacDto {
  @IsOptional() @IsString() @MaxLength(50) protocolo?: string;
  @IsOptional() @IsIn(['RECLAMACAO', 'ELOGIO']) tipo?: string;
  @IsOptional() @IsEnum(StatusAtendimentoSac) status?: StatusAtendimentoSac;
  @IsOptional() @IsUUID() atendenteId?: string;
  @IsOptional() @IsUUID() responsavelAcaoId?: string;
  @IsOptional() @IsString() @MaxLength(150) area?: string;
  @IsOptional() @IsDateString() inicio?: string;
  @IsOptional() @IsDateString() fim?: string;
  @IsOptional() @Matches(/^\d{1,6}$/) pagina?: string;
}
export class DirecionarSacDto {
  @IsUUID() atendenteId!: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(4000)
  observacao?: string;
}
export class ClassificarSacDto {
  @Transform(limpar)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  tipoReclamacao!: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(150)
  documento?: string;
  @Transform(limpar) @IsString() @MinLength(3) @MaxLength(4000) motivo!: string;
  @Transform(limpar) @IsString() @MinLength(2) @MaxLength(150) area!: string;
  @IsUUID() responsavelAcaoId!: string;
  @IsDateString() prazo!: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(4000)
  observacoesClassificacao?: string;
}
export class PlanoAcaoSacDto {
  @Transform(limpar) @IsString() @MinLength(3) @MaxLength(4000) oQue!: string;
  @Transform(limpar)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  executor!: string;
  @IsDateString() prazo!: string;
  @IsOptional() @IsDateString() dataExecucao?: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(4000)
  observacoes?: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(10000)
  reporte?: string;
}
export class RncSacDto {
  @IsBoolean() gerou!: boolean;
  @IsOptional() @Transform(limpar) @IsString() @MaxLength(150) numero?: string;
  @IsOptional() @IsDateString() data?: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) hora?: string;
  @IsOptional() @Transform(limpar) @IsString() @MaxLength(150) local?: string;
  @IsOptional() @Transform(limpar) @IsString() @MaxLength(150) setor?: string;
  @IsOptional() @Transform(limpar) @IsString() @MaxLength(4000) motivo?: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(10000)
  descricao?: string;
}
export class AvaliarSacDto {
  @IsBoolean() aprovado!: boolean;
  @IsOptional() @Transform(limpar) @IsString() @MaxLength(4000) motivo?: string;
}
export class ObservacaoSacDto {
  @Transform(limpar)
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  observacao!: string;
}
export class AnexoSacDto {
  @IsIn(['ANEXOS', 'CLASSIFICACAO', 'ACAO_CORRETIVA', 'RNC', 'CONCLUSAO']) etapa!: string;
  @IsOptional() @IsUUID() tarefaId?: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
