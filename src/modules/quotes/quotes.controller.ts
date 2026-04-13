import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { RespondQuoteDto } from './dto/respond-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';
import { QuotesService } from './quotes.service';


@ApiTags('Cotações')
@Controller('quotes')
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly prisma: PrismaService,
  ) { }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateQuoteDto,
  ) {
    const client = await this.prisma.client.findUnique({
      where: { userId: user.sub },
    });

    if (!client) {
      throw new NotFoundException('Perfil do cliente não encontrado');
    }

    return this.quotesService.create(client.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'clientId', required: false, type: String })
  @Get()
  findAll(
    @CurrentUser() user: { sub: string; role: string },
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.quotesService.findAll(user, { status, clientId });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async findMine(@CurrentUser() user: { sub: string }) {
    const client = await this.prisma.client.findUnique({
      where: { userId: user.sub },
    });

    if (!client) {
      throw new NotFoundException('Perfil do cliente não encontrado');
    }

    return this.quotesService.findMine(client.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(
    @CurrentUser() user: { sub: string; role: string },
    @Param('id') id: string,
  ) {
    return this.quotesService.findOne(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: { sub: string; role: string },
    @Param('id') id: string,
    @Body() dto: UpdateQuoteStatusDto,
  ) {
    return this.quotesService.updateStatus(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/respond')
respond(
  @CurrentUser() user: { sub: string; role: string },
  @Param('id') id: string,
  @Body() dto: RespondQuoteDto,
) {
  return this.quotesService.respond(user, id, dto);

  }
}