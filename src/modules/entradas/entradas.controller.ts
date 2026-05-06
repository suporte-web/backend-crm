import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateEntradaQuoteDto } from './dto/create-entrada-quote.dto';
import { CreateSiteTicketDto } from './dto/create-site-ticket.dto';
import { EntradaNoteDto, TransferEntradaDto } from './dto/entrada-actions.dto';
import { LinkProspectDto } from './dto/link-prospect.dto';
import { EntradasService } from './entradas.service';

@ApiTags('Entradas')
@Controller('entradas')
export class EntradasController {
  constructor(private readonly entradasService: EntradasService) {}

  @Post('site')
  createFromSite(@Body() dto: CreateSiteTicketDto) {
    return this.entradasService.createFromSite(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'tipo', required: false, type: String })
  @ApiQuery({ name: 'responsavelId', required: false, type: String })
  @ApiQuery({ name: 'origem', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String })
  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('tipo') tipo?: string,
    @Query('responsavelId') responsavelId?: string,
    @Query('origem') origem?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('q') q?: string,
  ) {
    return this.entradasService.findAll(user, {
      status,
      tipo,
      responsavelId,
      origem,
      dateFrom,
      dateTo,
      q,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.entradasService.findOne(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/assumir')
  assumir(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.entradasService.assumir(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id/prospects/sugestoes')
  findProspectSuggestions(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.entradasService.findProspectSuggestions(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/prospect')
  linkOrCreateProspect(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: LinkProspectDto,
  ) {
    return this.entradasService.linkOrCreateProspect(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/cotacao')
  createQuote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateEntradaQuoteDto,
  ) {
    return this.entradasService.createQuote(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/finalizar')
  finalizar(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: EntradaNoteDto,
  ) {
    return this.entradasService.finalizar(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/perder')
  marcarPerdido(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: EntradaNoteDto,
  ) {
    return this.entradasService.marcarPerdido(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/responsavel')
  transferir(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: TransferEntradaDto,
  ) {
    return this.entradasService.transferir(user, id, dto);
  }
}
