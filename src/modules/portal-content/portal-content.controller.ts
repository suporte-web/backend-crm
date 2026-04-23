import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { extname } from 'path';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreatePortalContentDto } from './dto/create-portal-content.dto';
import { UpdatePortalContentDto } from './dto/update-portal-content.dto';
import { PortalContentService } from './portal-content.service';

// `multer` types are not installed in this project, so the storage config stays local.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { diskStorage } = require('multer');

@ApiTags('Portal Content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('portal-content')
export class PortalContentController {
  constructor(private readonly portalContentService: PortalContentService) {}

  private buildMediaUrl(request: Request, fileName: string) {
    return `${request.protocol}://${request.get('host')}/uploads/portal-content/${fileName}`;
  }

  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.MARKETING)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePortalContentDto,
  ) {
    return this.portalContentService.create(user.sub, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.MARKETING)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/portal-content',
        filename: (
          _req: unknown,
          file: { fieldname: string; originalname: string },
          callback: (error: Error | null, fileName: string) => void,
        ) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(
            null,
            `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
          );
        },
      }),
      fileFilter: (
        _req: unknown,
        file: { mimetype: string },
        callback: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'video/mp4',
          'video/webm',
          'video/quicktime',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          callback(
            new BadRequestException('Envie uma imagem ou video em formato suportado.'),
            false,
          );
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 25 * 1024 * 1024,
      },
    }),
  )
  uploadMedia(
    @UploadedFile() file: { filename: string; mimetype: string },
    @Req() request: Request,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo nao enviado.');
    }

    return {
      fileName: file.filename,
      mimeType: file.mimetype,
      url: this.buildMediaUrl(request, file.filename),
    };
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
