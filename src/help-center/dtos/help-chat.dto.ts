import { IsString, MaxLength } from 'class-validator';

export class HelpChatDto {
  @IsString()
  @MaxLength(1000)
  message!: string;
}
