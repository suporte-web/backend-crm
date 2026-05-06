import { Module } from '@nestjs/common';
import { ChatsModule } from '../chats/chats.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [ChatsModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
