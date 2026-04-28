import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TicketType } from '@prisma/client';

export class CreateTicketDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  quoteId?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsEnum(TicketType)
  type?: TicketType;

  @IsString()
  subject!: string;

  @IsString()
  description!: string;
}
