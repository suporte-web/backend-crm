import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) { }

  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.clientsService.findMine(user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  @Get('owners/summary')
  getOwnersSummary(@CurrentUser() user: AuthUser) {
    return this.clientsService.getOwnersSummary(user);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('internalOwnerId') internalOwnerId?: string,
    @Query('status') status?: string,
    @Query('segment') segment?: string,
  ) {
    return this.clientsService.findAll(user, {
      internalOwnerId,
      status,
      segment,
    });
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  @Get(':id/summary')
  getSummary(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientsService.getSummary(user, id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  @Get(':id/timeline')
  getTimeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientsService.getTimeline(user, id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  @Get('my-portfolio')
  getMyPortfolio(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('segment') segment?: string,
  ) {
    return this.clientsService.getMyPortfolio(user, {
      status,
      segment,
    });
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientsService.findOne(user, id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(user, id, dto);
  }
}