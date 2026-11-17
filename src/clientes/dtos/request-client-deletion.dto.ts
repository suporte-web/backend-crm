import { IsOptional, IsString } from 'class-validator';

export class RequestClientDeletionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
