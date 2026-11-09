import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { UsersModule } from '../users/users.module';
import { AcessoCadastroGuard } from '../cadastros/acesso-cadastro.guard';
import { ConsultoraProposalUploadGuard } from '../../common/consultora-proposal-upload.guard';

@Module({
  imports: [UsersModule],
  controllers: [ClientsController],
  providers: [ClientsService, AcessoCadastroGuard, ConsultoraProposalUploadGuard],
  exports: [ClientsService],
})
export class ClientsModule {}
