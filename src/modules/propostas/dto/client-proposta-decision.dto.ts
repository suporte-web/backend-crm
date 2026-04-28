import { IsOptional, IsString } from 'class-validator';

export class ClientPropostaDecisionDto {
  @IsOptional()
  @IsString()
  motivo?: string;
}
