import { IsIn, IsOptional, IsString } from 'class-validator';

export class DecideClientDeletionDto {
  @IsIn(['APPROVE', 'REJECT'])
  action!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  message?: string;
}
