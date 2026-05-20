import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateHelpArticleDto } from './dto/create-help-article.dto';
import { HelpChatDto } from './dto/help-chat.dto';
import { UpdateHelpArticleStatusDto } from './dto/update-help-article-status.dto';
import { UpdateHelpArticleDto } from './dto/update-help-article.dto';
import { HelpCenterService } from './help-center.service';

@ApiTags('Central de Ajuda')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('help-center')
export class HelpCenterController {
  constructor(private readonly helpCenterService: HelpCenterService) {}

  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.MARKETING)
  @Get('articles')
  findAll() {
    return this.helpCenterService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.MARKETING)
  @Post('articles')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHelpArticleDto) {
    return this.helpCenterService.create(dto, user.sub);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.MARKETING)
  @Get('articles/:id')
  findOne(@Param('id') id: string) {
    return this.helpCenterService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.MARKETING)
  @Put('articles/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateHelpArticleDto,
  ) {
    return this.helpCenterService.update(id, dto, user.sub);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.MARKETING)
  @Patch('articles/:id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateHelpArticleStatusDto,
  ) {
    return this.helpCenterService.updateStatus(id, dto.active, user.sub);
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.GESTAO,
    UserRole.COMERCIAL,
    UserRole.MARKETING,
    UserRole.CLIENTE,
  )
  @Post('chat')
  chat(@Body() dto: HelpChatDto) {
    return this.helpCenterService.answerChat(dto.message);
  }
}
