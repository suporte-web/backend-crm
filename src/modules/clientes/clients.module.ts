import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { UsersModule } from '../users/users.module';
import { AcessoCadastroGuard } from '../cadastros/acesso-cadastro.guard';

@Module({
  imports: [UsersModule],
  controllers: [ClientsController],
  providers: [ClientsService, AcessoCadastroGuard],
})
export class ClientsModule {}
