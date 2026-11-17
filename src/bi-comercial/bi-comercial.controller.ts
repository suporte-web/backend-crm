import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { BiComercialService } from './bi-comercial.service';
import { ConsultarBiComercialDto } from './dtos/consultar-bi-comercial.dto';

@ApiTags('BI Comercial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bi-comercial')
export class BiComercialController {
  constructor(private readonly service: BiComercialService) {}

  @Get()
  consultar(@CurrentUser() user: AuthUser, @Query() filtros: ConsultarBiComercialDto) {
    return this.service.consultar(user, filtros);
  }
}
