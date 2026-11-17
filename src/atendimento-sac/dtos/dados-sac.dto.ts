import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({
    description: 'Protocolo do atendimento a consultar.',
    type: String,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  protocolo?: string;
  @ApiPropertyOptional({
    description: 'Tipo de manifestação recebida.',
    type: String,
    enum: ['RECLAMACAO', 'ELOGIO'],
  })
  @IsOptional()
  @IsIn(['RECLAMACAO', 'ELOGIO'])
  tipo?: string;
  @ApiPropertyOptional({
    description: 'Status atual do atendimento.',
    type: String,
    enum: StatusAtendimentoSac,
  })
  @IsOptional()
  @IsEnum(StatusAtendimentoSac)
  status?: StatusAtendimentoSac;
  @ApiPropertyOptional({
    description: 'Identificador do usuário responsável pelo atendimento.',
    type: String,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  atendenteId?: string;
  @ApiPropertyOptional({
    description: 'Identificador do usuário responsável pela ação corretiva.',
    type: String,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  responsavelAcaoId?: string;
  @ApiPropertyOptional({
    description: 'Área relacionada à manifestação.',
    type: String,
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  area?: string;
  @ApiPropertyOptional({
    description: 'Data inicial do período de consulta, em formato ISO 8601.',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  inicio?: string;
  @ApiPropertyOptional({
    description: 'Data final do período de consulta, em formato ISO 8601.',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  fim?: string;
  @ApiPropertyOptional({
    description:
      'Número da página, informado como texto numérico na query string.',
    type: String,
    example: '1',
  })
  @IsOptional()
  @Matches(/^\d{1,6}$/)
  pagina?: string;
}
export class DirecionarSacDto {
  @ApiProperty({
    description: 'Identificador do usuário responsável pelo atendimento.',
    type: String,
    format: 'uuid',
  })
  @IsUUID()
  atendenteId!: string;
  @ApiPropertyOptional({
    description: 'Observação a registrar no histórico do atendimento.',
    type: String,
    maxLength: 4000,
  })
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(4000)
  observacao?: string;
}
export class ClassificarSacDto {
  @ApiProperty({
    description: 'Classificação da reclamação.',
    type: String,
    minLength: 2,
    maxLength: 150,
  })
  @Transform(limpar)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  tipoReclamacao!: string;
  @ApiPropertyOptional({
    description: 'Documento relacionado à reclamação.',
    type: String,
    maxLength: 150,
  })
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(150)
  documento?: string;
  @ApiProperty({
    description: 'Motivo registrado nesta etapa do atendimento.',
    type: String,
    minLength: 3,
    maxLength: 4000,
  })
  @Transform(limpar)
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  motivo!: string;
  @ApiProperty({
    description: 'Área relacionada à manifestação.',
    type: String,
    minLength: 2,
    maxLength: 150,
  })
  @Transform(limpar)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  area!: string;
  @ApiProperty({
    description: 'Identificador do usuário responsável pela ação corretiva.',
    type: String,
    format: 'uuid',
  })
  @IsUUID()
  responsavelAcaoId!: string;
  @ApiProperty({
    description: 'Prazo da ação, em formato ISO 8601.',
    type: String,
  })
  @IsDateString()
  prazo!: string;
  @ApiPropertyOptional({
    description: 'Informações complementares da classificação.',
    type: String,
    maxLength: 4000,
  })
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(4000)
  observacoesClassificacao?: string;
}
export class PlanoAcaoSacDto {
  @ApiProperty({
    description: 'Descrição da ação que será executada.',
    type: String,
    minLength: 3,
    maxLength: 4000,
  })
  @Transform(limpar)
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  oQue!: string;
  @ApiProperty({
    description: 'Nome ou identificação de quem executará a ação.',
    type: String,
    minLength: 2,
    maxLength: 150,
  })
  @Transform(limpar)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  executor!: string;
  @ApiProperty({
    description: 'Prazo da ação, em formato ISO 8601.',
    type: String,
  })
  @IsDateString()
  prazo!: string;
  @ApiPropertyOptional({
    description: 'Data de execução da ação, em formato ISO 8601.',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  dataExecucao?: string;
  @ApiPropertyOptional({
    description: 'Informações complementares do plano de ação.',
    type: String,
    maxLength: 4000,
  })
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(4000)
  observacoes?: string;
  @ApiPropertyOptional({
    description: 'Relato da execução e dos resultados da ação.',
    type: String,
    maxLength: 10000,
  })
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(10000)
  reporte?: string;
}
export class RncSacDto {
  @ApiProperty({
    description: 'Indica se foi gerado um registro de não conformidade (RNC).',
    type: Boolean,
  })
  @IsBoolean()
  gerou!: boolean;
  @ApiPropertyOptional({
    description: 'Número do registro de não conformidade.',
    type: String,
    maxLength: 150,
  })
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(150)
  numero?: string;
  @ApiPropertyOptional({
    description: 'Data do registro de não conformidade, em formato ISO 8601.',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  data?: string;
  @ApiPropertyOptional({
    description: 'Horário do registro no formato HH:mm.',
    type: String,
    example: '14:30',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  hora?: string;
  @ApiPropertyOptional({
    description: 'Local da ocorrência.',
    type: String,
    maxLength: 150,
  })
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(150)
  local?: string;
  @ApiPropertyOptional({
    description: 'Setor relacionado ao registro.',
    type: String,
    maxLength: 150,
  })
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(150)
  setor?: string;
  @ApiPropertyOptional({
    description: 'Motivo registrado nesta etapa do atendimento.',
    type: String,
    maxLength: 4000,
  })
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(4000)
  motivo?: string;
  @ApiPropertyOptional({
    description: 'Descrição detalhada do registro de não conformidade.',
    type: String,
    maxLength: 10000,
  })
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(10000)
  descricao?: string;
}
export class AvaliarSacDto {
  @ApiProperty({
    description: 'Indica se a conclusão da ação foi aprovada.',
    type: Boolean,
  })
  @IsBoolean()
  aprovado!: boolean;
  @ApiPropertyOptional({
    description: 'Motivo registrado nesta etapa do atendimento.',
    type: String,
    maxLength: 4000,
  })
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(4000)
  motivo?: string;
}
export class ObservacaoSacDto {
  @ApiProperty({
    description: 'Observação a registrar no histórico do atendimento.',
    type: String,
    minLength: 3,
    maxLength: 4000,
  })
  @Transform(limpar)
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  observacao!: string;
}
export class AnexoSacDto {
  @ApiProperty({
    description: 'Etapa do atendimento à qual o anexo pertence.',
    type: String,
    enum: ['ANEXOS', 'CLASSIFICACAO', 'ACAO_CORRETIVA', 'RNC', 'CONCLUSAO'],
  })
  @IsIn(['ANEXOS', 'CLASSIFICACAO', 'ACAO_CORRETIVA', 'RNC', 'CONCLUSAO'])
  etapa!: string;
  @ApiPropertyOptional({
    description:
      'Identificador da tarefa vinculada ao anexo, quando aplicável.',
    type: String,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  tarefaId?: string;
  @ApiPropertyOptional({
    description: 'Comentário sobre o arquivo anexado.',
    type: String,
    maxLength: 1000,
  })
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
