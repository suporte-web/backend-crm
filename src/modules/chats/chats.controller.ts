import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { UpdateChatMessageDto } from './dto/update-chat-message.dto';
import { UpdateChatParticipantsDto } from './dto/update-chat-participants.dto';

@ApiTags('Chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.chatsService.findAll(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateChatDto) {
    return this.chatsService.create(user, dto);
  }

  @Get(':chatId/messages')
  findMessages(@CurrentUser() user: AuthUser, @Param('chatId') chatId: string) {
    return this.chatsService.findMessages(user, chatId);
  }

  @Post(':chatId/messages')
  sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('chatId') chatId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.chatsService.sendMessage(user, chatId, dto);
  }

  @Patch(':chatId/messages/:messageId')
  updateMessage(
    @CurrentUser() user: AuthUser,
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateChatMessageDto,
  ) {
    return this.chatsService.updateMessage(user, chatId, messageId, dto);
  }

  @Delete(':chatId/messages/:messageId')
  deleteMessage(
    @CurrentUser() user: AuthUser,
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatsService.deleteMessage(user, chatId, messageId);
  }

  @Patch(':chatId/participants')
  updateParticipants(
    @CurrentUser() user: AuthUser,
    @Param('chatId') chatId: string,
    @Body() dto: UpdateChatParticipantsDto,
  ) {
    return this.chatsService.updateParticipants(user, chatId, dto);
  }
}
