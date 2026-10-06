import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../modules/auth/decorators/current-user.decorator';
import { Roles } from '../modules/auth/decorators/roles.decorator';
import { UserRole } from '../modules/auth/enums/user-role.enum';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import type { AuthUser } from '../modules/auth/types/auth-user.type';
import { ImportManualReportDto } from './dto/import-manual-report.dto';
import { ManualReportsService } from './manual-reports.service';

@ApiTags('Métricas de Marketing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MARKETING)
@Controller('marketing-metrics/manual-reports')
export class ManualReportsController {
  constructor(private readonly reports: ManualReportsService) {}
  @Get() list() {
    return this.reports.list();
  }
  @Get(':id') find(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reports.find(id);
  }
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 4 },
    }),
  )
  import(
    @Body() dto: ImportManualReportDto,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: { buffer: Buffer; originalname: string },
  ) {
    return this.reports.import(dto, user.sub, file);
  }
}
