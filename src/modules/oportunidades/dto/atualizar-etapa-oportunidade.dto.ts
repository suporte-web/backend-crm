import { CampoCompativel } from './campo-compativel.decorator';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OpportunityStage as EtapaOportunidade } from '@prisma/client';

export class AtualizarEtapaOportunidadeDto {
  @IsEnum(EtapaOportunidade, {
    message: 'Selecione uma etapa válida da oportunidade.',
  })
  @CampoCompativel('etapa', 'stage')
  etapa!: EtapaOportunidade;

  @IsOptional()
  @IsString({ message: 'Informe um texto válido.' })
  @CampoCompativel('motivoPerda', 'lostReason')
  motivoPerda?: string;
}
