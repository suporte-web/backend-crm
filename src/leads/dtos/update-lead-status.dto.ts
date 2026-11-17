import { IsString } from 'class-validator';

export class UpdateLeadStatusDto {
  @IsString()
  status!: string;
}
