import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.GESTAO)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() filters: QueryAuditLogsDto) {
    return this.auditLogsService.findAll(user, filters);
  }

  @Get('summary')
  getSummary(@CurrentUser() user: AuthUser, @Query() filters: QueryAuditLogsDto) {
    return this.auditLogsService.getSummary(user, filters);
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @CurrentUser() user: AuthUser,
    @Query() filters: QueryAuditLogsDto,
    @Res() response: Response,
  ) {
    const csv = await this.auditLogsService.exportCsv(user, filters);
    const suffix = filters.dateFrom || filters.dateTo || new Date().toISOString().slice(0, 10);

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="logs-operacionais-${suffix}.csv"`,
    );

    return response.status(200).send(csv);
  }
}
