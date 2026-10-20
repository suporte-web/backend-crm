import { CampoCompativel } from './campo-compativel.decorator';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { OpportunityStage as EtapaOportunidade } from '@prisma/client';

export class CriarOportunidadeDto {
  @IsUUID('all', { message: 'Informe um identificador válido.' })
  @CampoCompativel('clienteId', 'clientId')
  clienteId!: string;

  @IsOptional()
  @IsUUID('all', { message: 'Informe um identificador válido.' })
  @CampoCompativel('cotacaoId', 'quoteId')
  cotacaoId?: string;

  @IsString({ message: 'Informe um texto válido.' })
  @CampoCompativel('titulo', 'title')
  titulo!: string;

  @IsOptional()
  @IsNumber({}, { message: 'Informe um valor numérico válido.' })
  @CampoCompativel('valor', 'value', true)
  valor?: number;

  @IsOptional()
  @IsEnum(EtapaOportunidade, {
    message: 'Selecione uma etapa válida da oportunidade.',
  })
  @CampoCompativel('etapa', 'stage')
  etapa?: EtapaOportunidade;

  @IsOptional()
  @IsDateString({}, { message: 'Informe uma data válida.' })
  @CampoCompativel('previsaoFechamento', 'expectedCloseDate')
  previsaoFechamento?: string;

  @IsOptional()
  @IsBoolean({ message: 'Informe verdadeiro ou falso.' })
  @CampoCompativel('preContrato', 'preContract')
  preContrato?: boolean;

  @IsOptional()
  @IsString({ message: 'Informe um texto válido.' })
  @CampoCompativel('observacoesPreContrato', 'preContractNotes')
  observacoesPreContrato?: string;
}
