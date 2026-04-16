import { IsString } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  subject!: string;

  @IsString()
  description!: string;
}