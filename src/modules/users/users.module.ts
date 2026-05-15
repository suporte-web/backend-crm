import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ScreenPermissionsController } from './screen-permissions.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController, ScreenPermissionsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
