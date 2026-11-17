import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ConvertLeadToProspectDto {
  @IsOptional()
  @IsString()
  nomeRazaoSocial?: string;

  @IsOptional()
  @IsString()
  nomeContato?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  estado?: string;
}
