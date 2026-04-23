import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OpportunityStage } from '@prisma/client';

export class UpdateOpportunityStageDto {
  @IsEnum(OpportunityStage)
  stage!: OpportunityStage;

  @IsOptional()
  @IsString()
  lostReason?: string;
}
