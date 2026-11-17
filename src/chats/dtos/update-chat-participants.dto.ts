import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ChatParticipantInputDto } from './create-chat.dto';

export class UpdateChatParticipantsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatParticipantInputDto)
  participants!: ChatParticipantInputDto[];
}
