import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendPreProposalDto {
  @IsString()
  message!: string;

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
