import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CampoCompativel } from './campo-compativel.decorator';

export class DadosPerdaDto {
  @IsOptional()
  @IsString({ message: 'Selecione um motivo da perda válido.' })
  @MaxLength(200, { message: 'Selecione um motivo da perda válido.' })
  @CampoCompativel('motivoPerda', 'lostReason')
  motivoPerda?: string | null;

  @IsOptional()
  @IsString({ message: 'Informe uma observação da perda válida.' })
  @MaxLength(2000, {
    message: 'As observações da perda devem ter no máximo 2000 caracteres.',
  })
  @CampoCompativel('observacaoPerda', 'observacaoPerda')
  observacaoPerda?: string | null;
}
