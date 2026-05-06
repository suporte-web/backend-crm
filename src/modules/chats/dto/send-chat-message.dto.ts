import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ChatMessageVisibility } from '@prisma/client';

export class SendChatMessageDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsEnum(ChatMessageVisibility)
  visibility: ChatMessageVisibility = ChatMessageVisibility.PUBLICA_CLIENTE;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  authorizedUserIds?: string[];
}
