import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateClientDto } from '../../clientes/dto/create-client.dto';
import { CreateLeadDto } from '../../leads/dto/create-lead.dto';

export const ETAPAS_FUNIL_COMERCIAL = [
  'entrada_leads',
  'conversao',
  'homologacao',
  'cotacao',
  'venda_efetivada',
  'pos_venda',
  'perdido',
] as const;

export class DadosComerciaisCadastroDto {
  @IsOptional()
  @IsString()
  fotoUrl?: string;
  @IsOptional()
  @IsString()
  proximaAcao?: string;

  @IsOptional()
  @IsString()
  responsavel?: string;

  @IsOptional()
  @IsString()
  volumeMensalEstimado?: string;
}

export class AtualizarFotoCadastroDto {
  @IsString()
  fotoUrl: string;
}

export class AtualizarEtapaCadastroDto extends DadosComerciaisCadastroDto {
  @IsIn(ETAPAS_FUNIL_COMERCIAL, {
    message: 'Selecione uma etapa válida do funil comercial.',
  })
  etapa: string;
}

export class CriarCadastroDto extends CreateClientDto {
  @IsOptional()
  @IsString()
  fotoUrl?: string;
  @IsOptional()
  @IsString()
  proximaAcao?: string;

  @IsOptional()
  @IsString()
  responsavel?: string;

  @IsOptional()
  @IsString()
  volumeMensalEstimado?: string;
  @IsIn(['CLIENTE', 'LEAD'], {
    message: 'Selecione Cliente ou Lead como modalidade do cadastro.',
  })
  modalidadeCadastro: 'CLIENTE' | 'LEAD';

  @IsOptional()
  @IsIn(ETAPAS_FUNIL_COMERCIAL, {
    message: 'Selecione uma etapa válida do funil comercial.',
  })
  etapaFunil?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateLeadDto)
  dadosLead?: CreateLeadDto;
}

export class AlterarModalidadeDto {
  @IsIn(['CLIENTE', 'LEAD'], {
    message: 'Selecione Cliente ou Lead como modalidade do cadastro.',
  })
  modalidadeCadastro: 'CLIENTE' | 'LEAD';

  @IsOptional()
  @IsString()
  document?: string;
}
