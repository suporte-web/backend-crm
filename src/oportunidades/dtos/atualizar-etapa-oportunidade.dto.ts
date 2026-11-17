import { DadosPerdaDto } from './dados-perda.dto';
import { CampoCompativel } from './campo-compativel.decorator';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OpportunityStage as EtapaOportunidade } from '@prisma/client';

export class AtualizarEtapaOportunidadeDto extends DadosPerdaDto {
  @IsEnum(EtapaOportunidade, {
    message: 'Selecione uma etapa válida da oportunidade.',
  })
  @CampoCompativel('etapa', 'stage')
  etapa!: EtapaOportunidade;

}
