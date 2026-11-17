import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideLeadDeletionDto {
  @IsIn(['APPROVE', 'REJECT'])
  action!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
