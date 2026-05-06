import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { OpportunityStage } from '@prisma/client';

export class UpdateOpportunityDto {
  @IsOptional()
  @IsUUID()
  quoteId?: string | null;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  value?: number | null;

  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string | null;

  @IsOptional()
  @IsBoolean()
  preContract?: boolean;

  @IsOptional()
  @IsString()
  preContractNotes?: string | null;

  @IsOptional()
  @IsString()
  lostReason?: string | null;
}
