import { IsOptional, IsString } from 'class-validator';

export class ImportLeadsCsvDto {
  @IsOptional()
  @IsString()
  defaultSource?: string;

  @IsOptional()
  @IsString()
  defaultStatus?: string;
}
