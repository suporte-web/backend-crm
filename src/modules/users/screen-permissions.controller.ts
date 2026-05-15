import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole as AuthUserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UpdateRoleScreenPermissionsDto } from './dto/update-role-screen-permissions.dto';
import { UsersService } from './users.service';

@ApiTags('Permissoes de telas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AuthUserRole.ADMIN, AuthUserRole.GESTAO, AuthUserRole.COMERCIAL)
@Controller('screen-permissions')
export class ScreenPermissionsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findScreenPermissions() {
    return this.usersService.findScreenPermissions();
  }

  @Get(':role')
  findRoleScreenPermissions(
    @Param('role', new ParseEnumPipe(UserRole)) role: UserRole,
  ) {
    return this.usersService.findRoleScreenPermissions(role);
  }

  @Put(':role')
  updateRoleScreenPermissions(
    @CurrentUser() user: AuthUser,
    @Param('role', new ParseEnumPipe(UserRole)) role: UserRole,
    @Body() dto: UpdateRoleScreenPermissionsDto,
  ) {
    return this.usersService.updateRoleScreenPermissions(role, dto, user);
  }
}
