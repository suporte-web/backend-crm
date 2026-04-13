import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  ) {}

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
      throw new Error('Client profile not found');
    }

    return this.quotesService.create(client.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async findMine(@CurrentUser() user: { sub: string }) {
    const client = await this.prisma.client.findUnique({
      where: { userId: user.sub },
    });

    if (!client) {
      throw new Error('Client profile not found');
    }

    return this.quotesService.findMine(client.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quotesService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateQuoteStatusDto) {
    return this.quotesService.updateStatus(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/respond')
  respond(@Param('id') id: string, @Body() dto: RespondQuoteDto) {
    return this.quotesService.respond(id, dto);
  }
}