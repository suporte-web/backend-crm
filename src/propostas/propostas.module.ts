import { Module } from '@nestjs/common';
import { ChatsModule } from '../chats/chats.module';
import { PropostasController } from './propostas.controller';
import { PropostasService } from './propostas.service';

@Module({
  imports: [ChatsModule],
  controllers: [PropostasController],
  providers: [PropostasService],
})
export class PropostasModule {}
