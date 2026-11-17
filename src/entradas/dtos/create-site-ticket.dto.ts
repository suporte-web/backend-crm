import { IsEmail, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateSiteTicketDto {
  @IsString()
  nomeSolicitante!: string;

  @IsOptional()
  @IsEmail()
  emailSolicitante?: string;

  @IsOptional()
  @IsString()
  telefoneSolicitante?: string;

  @IsOptional()
  @IsString()
  mensagem?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  prioridade?: string;

  @IsOptional()
  @IsObject()
  formPayload?: Record<string, unknown>;
}
