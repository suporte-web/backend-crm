import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class ConvertLeadToClientDto {
  @IsString()
  @MinLength(1)
  document!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  internalOwnerId?: string;
}
