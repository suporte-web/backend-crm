import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateSupplierInviteDto } from './dto/create-supplier-invite.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('Fornecedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get('invites')
  findInvites(@CurrentUser() user: AuthUser) {
    return this.suppliersService.findInvites(user);
  }

  @Post('invites')
  createInvite(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSupplierInviteDto,
  ) {
    return this.suppliersService.createInvite(user, dto);
  }
}
