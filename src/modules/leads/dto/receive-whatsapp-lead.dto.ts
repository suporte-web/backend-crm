import { IsObject, IsOptional, IsString } from 'class-validator';

export class ReceiveWhatsAppLeadDto {
  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  externalMessageId?: string;

  @IsOptional()
  @IsString()
  externalContactId?: string;

  @IsOptional()
  @IsString()
  sourcePhone?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, unknown>;
}
