import { Module } from '@nestjs/common';
import { ScreenPermissionsController } from './screen-permissions.controller';
import { ScreenPermissionsService } from './screen-permissions.service';

@Module({
  controllers: [ScreenPermissionsController],
  providers: [ScreenPermissionsService],
})
export class ScreenPermissionsModule {}