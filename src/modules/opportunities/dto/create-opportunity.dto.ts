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

export class CreateOpportunityDto {
  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsUUID()
  quoteId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsBoolean()
  preContract?: boolean;

  @IsOptional()
  @IsString()
  preContractNotes?: string;
}
