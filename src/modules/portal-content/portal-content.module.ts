import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PortalContentController } from './portal-content.controller';
import { PortalContentService } from './portal-content.service';

@Module({
  imports: [PrismaModule],
  controllers: [PortalContentController],
  providers: [PortalContentService],
  exports: [PortalContentService],
})
export class PortalContentModule {}
