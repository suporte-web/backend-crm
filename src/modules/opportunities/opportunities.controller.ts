import {
  BadRequestException,
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
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityStageDto } from './dto/update-opportunity-stage.dto';
import { OpportunitiesService } from './opportunities.service';

@ApiTags('Opportunities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOpportunityDto) {
    return this.opportunitiesService.create(user, dto);
  }

  @ApiQuery({ name: 'clientId', required: false, type: String })
  @ApiQuery({ name: 'stage', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('clientId') clientId?: string,
    @Query('stage') stage?: string,
    @Query('status') status?: string,
  ) {
    return this.opportunitiesService.findAll(user, {
      clientId,
      stage,
      status,
    });
  }

  @Patch(':id/stage')
  updateStage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityStageDto,
  ) {
    if (!id) {
      throw new BadRequestException('Id da oportunidade e obrigatorio.');
    }

    return this.opportunitiesService.updateStage(user, id, dto);
  }
}
