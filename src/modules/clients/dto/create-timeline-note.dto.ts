import { IsOptional, IsString } from 'class-validator';

export class CreateTimelineNoteDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  description!: string;
}
