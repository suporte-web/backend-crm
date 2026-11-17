import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ImportManualReportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @IsString()
  @Matches(/^\d{1,20}$/)
  propertyId: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  inicio: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fim: string;
}
