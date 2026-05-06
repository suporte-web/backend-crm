import { IsOptional, IsString } from 'class-validator';

export class ManagementPropostaDecisionDto {
  @IsOptional()
  @IsString()
  motivo?: string;
}
