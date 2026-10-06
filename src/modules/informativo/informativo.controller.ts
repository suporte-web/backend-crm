import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CriarAssinanteDto } from './dto/criar-assinante.dto';
import { ListarAssinantesDto } from './dto/listar-assinantes.dto';
import { IntegracaoInformativoGuard } from './guards/integracao-informativo.guard';
import { InformativoService } from './informativo.service';

@ApiTags('Informativo Pizzattolog')
@Controller('informativo')
export class InformativoController {
  constructor(private readonly service: InformativoService) {}

  @Post('site')
  @HttpCode(200)
  @UseGuards(IntegracaoInformativoGuard)
  cadastrar(@Body() dto: CriarAssinanteDto) {
    return this.service.cadastrar(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  listar(@Query() filtros: ListarAssinantesDto) {
    return this.service.listar(filtros);
  }
}
