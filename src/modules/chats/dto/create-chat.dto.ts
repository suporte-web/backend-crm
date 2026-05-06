import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChatEntityType } from '@prisma/client';

export class ChatParticipantInputDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsBoolean()
  canRead?: boolean;

  @IsOptional()
  @IsBoolean()
  canWrite?: boolean;
}

export class CreateChatDto {
  @IsEnum(ChatEntityType)
  entityType!: ChatEntityType;

  @IsUUID()
  entityId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique((participant: ChatParticipantInputDto) => participant.userId)
  @ValidateNested({ each: true })
  @Type(() => ChatParticipantInputDto)
  participants?: ChatParticipantInputDto[];
}
