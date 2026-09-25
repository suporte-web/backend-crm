import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '../modules/auth/decorators/roles.decorator';
import { UserRole } from '../modules/auth/enums/user-role.enum';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { MarketingIntegrationsService } from './marketing-integrations.service';

@ApiTags('Integrações de Marketing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MARKETING)
@Controller('marketing-integrations')
export class MarketingIntegrationsController {
  constructor(
    private readonly marketingIntegrationsService: MarketingIntegrationsService,
  ) {}

  @Get()
  findAll() {
    return this.marketingIntegrationsService.findAll();
  }
}
