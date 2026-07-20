import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { extname, join } from 'path';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateTimelineNoteDto } from './dto/create-timeline-note.dto';
import { DecideClientDeletionDto } from './dto/decide-client-deletion.dto';
import { RequestClientDeletionDto } from './dto/request-client-deletion.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const { diskStorage } = require('multer');

type UploadedClientDocumentFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

const clientDocumentFileInterceptor = FileInterceptor('file', {
  storage: diskStorage({
    destination: join(process.cwd(), 'uploads', 'client-documents'),
    filename: (
      _req: unknown,
      file: { fieldname: string; originalname: string },
      callback: (error: Error | null, fileName: string) => void,
    ) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const extension = extname(file.originalname).toLowerCase();

      callback(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.clientsService.findMine(user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.GESTAO,
    UserRole.COMERCIAL,
    UserRole.MARKETING,
  )
  @Get('owners/summary')
  getOwnersSummary(@CurrentUser() user: AuthUser) {
    return this.clientsService.getOwnersSummary(user);
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.GESTAO,
    UserRole.COMERCIAL,
    UserRole.MARKETING,
  )
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateClientDto) {
    return this.clientsService.create(user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.GESTAO,
    UserRole.COMERCIAL,
    UserRole.MARKETING,
  )
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
  @Roles(
    UserRole.ADMIN,
    UserRole.GESTAO,
    UserRole.COMERCIAL,
    UserRole.MARKETING,
  )
  @Get('dashboard/summary')
  getDashboardSummary(@CurrentUser() user: AuthUser) {
    return this.clientsService.getDashboardSummary(user);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  @Get('deletion-requests')
  getDeletionRequests(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
  ) {
    return this.clientsService.getDeletionRequests(user, status);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO)
  @Post('deletion-requests/:requestId/decision')
  decideDeletionRequest(
    @CurrentUser() user: AuthUser,
    @Param('requestId') requestId: string,
    @Body() dto: DecideClientDeletionDto,
  ) {
    return this.clientsService.decideDeletionRequest(user, requestId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.GESTAO,
    UserRole.COMERCIAL,
    UserRole.MARKETING,
  )
  @Get(':id/summary')
  getSummary(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientsService.getSummary(user, id);
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.GESTAO,
    UserRole.COMERCIAL,
    UserRole.MARKETING,
  )
  @Get(':id/detail')
  getDetail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientsService.getDetail(user, id);
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.GESTAO,
    UserRole.COMERCIAL,
    UserRole.MARKETING,
  )
  @Get(':id/timeline')
  getTimeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientsService.getTimeline(user, id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  @Post(':id/timeline')
  createTimelineNote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateTimelineNoteDto,
  ) {
    return this.clientsService.createTimelineNote(user, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  @Post(':id/documents')
  @UseInterceptors(clientDocumentFileInterceptor)
  uploadDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: UploadedClientDocumentFile,
    @Body('description') description?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado.');
    }

    return this.clientsService.createDocument(user, id, file, description);
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.GESTAO,
    UserRole.COMERCIAL,
    UserRole.MARKETING,
  )
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
  @Roles(
    UserRole.ADMIN,
    UserRole.GESTAO,
    UserRole.COMERCIAL,
    UserRole.MARKETING,
  )
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

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  @Post(':id/deletion-request')
  requestDeletion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RequestClientDeletionDto,
  ) {
    return this.clientsService.requestDeletion(user, id, dto);
  }
}
