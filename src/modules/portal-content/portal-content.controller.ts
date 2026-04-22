import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreatePortalContentDto } from './dto/create-portal-content.dto';
import { UpdatePortalContentDto } from './dto/update-portal-content.dto';
import { PortalContentService } from './portal-content.service';

@ApiTags('Portal Content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('portal-content')
export class PortalContentController {
  constructor(private readonly portalContentService: PortalContentService) {}

  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.MARKETING)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePortalContentDto,
  ) {
    return this.portalContentService.create(user.sub, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.MARKETING)
  @Get()
  findAll() {
    return this.portalContentService.findAll(true);
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.GESTAO,
    UserRole.MARKETING,
    UserRole.CLIENTE,
    UserRole.COMERCIAL,
  )
  @Get('published')
  findPublished() {
    return this.portalContentService.findPublished();
  }

  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.MARKETING)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.portalContentService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.MARKETING)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePortalContentDto) {
    return this.portalContentService.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.MARKETING)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.portalContentService.remove(id);
  }
}
