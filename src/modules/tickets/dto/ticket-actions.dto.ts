import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class SendPreProposalDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  descricaoServico?: string;

  @IsOptional()
  @IsString()
  origem?: string;

  @IsOptional()
  @IsString()
  destino?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  valor?: number;

  @IsOptional()
  @IsString()
  condicoesPagamento?: string;

  @IsOptional()
  @IsString()
  condicoesComerciais?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  validadeDias?: number;

  @IsOptional()
  @IsDateString()
  validaAte?: string;

  @IsOptional()
  @IsString()
  preContractNotes?: string;

  @IsOptional()
  @IsUUID()
  opportunityId?: string;
}

export class SendToManagementDto {
  @IsOptional()
  @IsString()
  message?: string;
}

export class ClientTicketDecisionDto {
  @IsIn(['APPROVE', 'REQUEST_ADJUSTMENT', 'REJECT'])
  action!: 'APPROVE' | 'REQUEST_ADJUSTMENT' | 'REJECT';

  @IsOptional()
  @IsString()
  message?: string;
}

export class ManagementTicketDecisionDto {
  @IsIn(['APPROVE', 'REQUEST_ADJUSTMENT', 'REJECT'])
  action!: 'APPROVE' | 'REQUEST_ADJUSTMENT' | 'REJECT';

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  notifyClient?: boolean;
}
