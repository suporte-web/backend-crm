import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClientContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsString()
  cnae?: string;

  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @IsOptional()
  @IsString()
  businessActivity?: string;

  @IsOptional()
  @IsString()
  taxRegime?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  bankDetails?: string;

  @IsOptional()
  @IsString()
  modality?: string;

  @IsOptional()
  @IsString()
  registrationDate?: string;

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  internalOwnerId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateClientContactDto)
  contacts?: CreateClientContactDto[];
}
