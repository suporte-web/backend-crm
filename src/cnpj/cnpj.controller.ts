import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { CnpjService } from './cnpj.service';

@ApiTags('CNPJ')
@ApiBearerAuth()
@Controller('cnpj')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.MARKETING, UserRole.CONSULTORA)
export class CnpjController {
  constructor(private readonly service: CnpjService) {}
  @Get(':cnpj')
  consultar(@Param('cnpj') cnpj: string) { return this.service.consultar(cnpj); }
}
