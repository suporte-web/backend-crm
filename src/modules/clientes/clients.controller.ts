import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { extname, join } from 'path';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateClientContactDto } from './dto/create-client.dto';
import { CreateTimelineNoteDto } from './dto/create-timeline-note.dto';
import { DecideClientDeletionDto } from './dto/decide-client-deletion.dto';
import { RequestClientDeletionDto } from './dto/request-client-deletion.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { DeleteClientDocumentDto } from './dto/delete-client-document.dto';
import { Delete } from '@nestjs/common';
import { UpdateOpportunityStatusDto } from './dto/update-oportunidade-status.dto';

const { diskStorage } = require('multer');

type UploadedClientDocumentFile = {
  fieldname?: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

const clientDocumentFileInterceptor = FileFieldsInterceptor(
  [
    { name: 'file', maxCount: 20 },
    { name: 'files', maxCount: 20 },
  ],
  {
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
      files: 20,
    },
  },
);

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
  @Post(':id/contacts')
  createContact(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateClientContactDto,
  ) {
    return this.clientsService.createContact(user, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  @Patch(':id/contacts/:contactId')
  updateContact(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: CreateClientContactDto,
  ) {
    return this.clientsService.updateContact(user, id, contactId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  @Delete(':id/contacts/:contactId')
  deleteContact(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return this.clientsService.deleteContact(user, id, contactId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  @Post(':id/documents')
  @UseInterceptors(clientDocumentFileInterceptor)
  uploadDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFiles()
    filesByField: {
      file?: UploadedClientDocumentFile[];
      files?: UploadedClientDocumentFile[];
    },
    @Body('description') description?: string,
    @Body('category') category?: string,
  ) {
    const files = [
      ...(filesByField?.file ?? []),
      ...(filesByField?.files ?? []),
    ];

    if (files.length === 0) {
      throw new BadRequestException('Arquivo não enviado.');
    }

    if (files.length === 1) {
      return this.clientsService.createDocument(
        user,
        id,
        files[0],
        description,
        category,
      );
    }

    return this.clientsService.createDocuments(
      user,
      id,
      files,
      description,
      category,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.GESTAO,
    UserRole.COMERCIAL,
    UserRole.MARKETING,
  )
  @Get(':id/documents/:documentId/download')
  async downloadDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Res() response: Response,
  ) {
    const document = await this.clientsService.getDocumentDownload(
      user,
      id,
      documentId,
    );

    response.setHeader('Content-Type', document.mimeType);
    return response.download(document.filePath, document.originalName);
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

  @Delete(':id/documents/:documentId')
  deleteDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') clientId: string,
    @Param('documentId') documentId: string,
    @Body() dto: DeleteClientDocumentDto,
  ) {
    return this.clientsService.deleteDocument(user, clientId, documentId, dto);
  }

  // Rota Status da proposta

  @Patch(':clientId/opportunities/:opportunityId/status')
  updateOpportunityStatus(
    @Param('clientId') clientId: string,
    @Param('opportunityId') opportunityId: string,
    @Body() dto: UpdateOpportunityStatusDto,
  ) {
    return this.clientsService.updateOpportunityStatus(
      clientId,
      opportunityId,
      dto.status,
    );
  }
}
