import { IsOptional, IsString } from 'class-validator';

export class CreateTimelineNoteDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  contactChannel?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  contactedAt?: string;
}
