import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ClassificacaoVisita, EtapaVisita, StatusVisita } from '@prisma/client';
import { PartialType } from '@nestjs/swagger';
const limpar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class ParticipanteVisitaDto {
  @Transform(limpar) @IsString() @MinLength(2) @MaxLength(150) nome!: string;
  @IsOptional() @IsEmail() @MaxLength(200) email?: string;
  @IsOptional() @Transform(limpar) @IsString() @MaxLength(40) telefone?: string;
  @IsOptional() @IsUUID() usuarioId?: string;
}
export class CriarVisitaDto {
  @Transform(limpar) @IsString() @MinLength(2) @MaxLength(150) clienteNome!: string;
  @IsOptional() @Transform(limpar) @IsString() @MaxLength(40) cnpj?: string;
  @Transform(limpar)
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  localVisita!: string;
  @IsDateString() dataPrevista!: string;
  @IsUUID() responsavelId!: string;
  @Transform(limpar)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  tipoVisita!: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(10000)
  observacoes?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ParticipanteVisitaDto)
  participantes?: ParticipanteVisitaDto[];
}
export class AtualizarVisitaDto extends PartialType(CriarVisitaDto) {}
export class ParticipantesVisitaDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ParticipanteVisitaDto)
  participantes!: ParticipanteVisitaDto[];
}
export class FiltroVisitaDto {
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(50)
  protocolo?: string;
  @IsOptional() @Transform(limpar) @IsString() @MaxLength(150) cliente?: string;
  @IsOptional() @IsEnum(StatusVisita) status?: StatusVisita;
  @IsOptional() @IsUUID() responsavelId?: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(150)
  tipoVisita?: string;
  @IsOptional() @IsDateString() inicio?: string;
  @IsOptional() @IsDateString() fim?: string;
  @IsOptional() @Matches(/^[1-9]\d{0,5}$/) pagina?: string;
}
export class ReagendarVisitaDto {
  @Transform(limpar) @IsString() @MinLength(3) @MaxLength(4000) motivo!: string;
  @IsDateString() novaData!: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(4000)
  observacoes?: string;
}
export class RealizarVisitaDto {
  @IsDateString() dataRealizada!: string;
  @Transform(limpar)
  @IsString()
  @MinLength(3)
  @MaxLength(10000)
  relato!: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(10000)
  insights?: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(10000)
  pontosPositivos?: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(10000)
  pontosAtencao?: string;
  @Transform(limpar)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  pessoaAtendeu!: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(40)
  contatoPessoaAtendeu?: string;
  @IsOptional() @IsEmail() @MaxLength(200) emailPessoaAtendeu?: string;
  @IsBoolean() teveCusto!: boolean;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999.99)
  custo?: number;
}
export class ValidarVisitaDto {
  @IsIn(['APROVAR', 'AJUSTAR', 'REAGENDAR']) decisao!:
    | 'APROVAR'
    | 'AJUSTAR'
    | 'REAGENDAR';
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(4000)
  observacao?: string;
  @IsOptional() @IsDateString() novaData?: string;
}
export class PosVisitaDto {
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(4000)
  ajustesNecessarios?: string;
  @IsOptional() @IsBoolean() novaDataAceita?: boolean;
  @IsBoolean() atingiuObjetivo!: boolean;
  @Transform(limpar)
  @IsString()
  @MinLength(3)
  @MaxLength(10000)
  sentimentoCliente!: string;
  @IsBoolean() possuiMelhoria!: boolean;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(10000)
  melhoriaIdentificada?: string;
  @IsEnum(ClassificacaoVisita) classificacao!: ClassificacaoVisita;
  @IsBoolean() gerarSac!: boolean;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(150)
  tipoReclamacao?: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(10000)
  relatoSac?: string;
  @IsOptional() @IsEmail() @MaxLength(200) email?: string;
  @IsOptional() @Transform(limpar) @IsString() @MaxLength(40) telefone?: string;
  @IsOptional() @Transform(limpar) @IsString() @MaxLength(150) cidade?: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) estado?: string;
}
export class AnexoVisitaDto {
  @IsEnum(EtapaVisita) etapa!: EtapaVisita;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
