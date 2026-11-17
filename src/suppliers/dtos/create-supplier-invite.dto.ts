import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateSupplierInviteDto {
  @IsString()
  companyName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
