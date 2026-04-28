import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketStatus } from '@prisma/client';

export class CreateTicketMessageDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @IsOptional()
  @IsEnum(TicketStatus)
  nextStatus?: TicketStatus;
}
