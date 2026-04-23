import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { extname } from 'path';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ImportLeadsCsvDto } from './dto/import-leads-csv.dto';
import { ReceiveWhatsAppLeadDto } from './dto/receive-whatsapp-lead.dto';
import { LeadsService } from './leads.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { diskStorage } = require('multer');

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.MARKETING)
  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('source') source?: string,
    @Query('status') status?: string,
  ) {
    return this.leadsService.findAll(user, { q, source, status });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.MARKETING)
  @Get('import-jobs')
  getImportJobs(@CurrentUser() user: AuthUser) {
    return this.leadsService.getImportJobs(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.MARKETING)
  @Get('import-jobs/:id')
  getImportJob(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leadsService.getImportJob(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.MARKETING)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeadDto) {
    return this.leadsService.createManual(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.MARKETING)
  @Post('import/csv')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/lead-imports',
        filename: (
          _req: unknown,
          file: { fieldname: string; originalname: string },
          callback: (error: Error | null, fileName: string) => void,
        ) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (
        _req: unknown,
        file: { mimetype: string; originalname: string },
        callback: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        const extension = extname(file.originalname).toLowerCase();
        const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];

        if (!allowedMimeTypes.includes(file.mimetype) && extension !== '.csv') {
          callback(new BadRequestException('Envie um arquivo CSV valido.'), false);
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
    }),
  )
  importCsv(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: { path: string; originalname: string; mimetype: string },
    @Body() dto: ImportLeadsCsvDto,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo CSV nao enviado.');
    }

    return this.leadsService.importCsv(user, file, dto);
  }

  @Post('integrations/whatsapp')
  receiveFromWhatsApp(
    @Headers('x-integration-token') token: string | undefined,
    @Body() dto: ReceiveWhatsAppLeadDto,
    @Req() request: Request,
  ) {
    return this.leadsService.receiveFromWhatsApp(dto, {
      integrationToken: token,
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? undefined,
    });
  }

  @Get('integrations/whatsapp/webhook')
  verifyWhatsAppWebhook(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') verifyToken?: string,
    @Query('hub.challenge') challenge?: string,
    @Res() response?: Response,
  ) {
    const result = this.leadsService.verifyWhatsAppWebhook({
      mode,
      verifyToken,
      challenge,
    });

    if (response) {
      return response.status(200).send(result);
    }

    return result;
  }

  @Post('integrations/whatsapp/webhook')
  @HttpCode(200)
  receiveWhatsAppWebhook(
    @Headers('x-integration-token') token: string | undefined,
    @Body() payload: Record<string, unknown>,
    @Req() request: Request,
  ) {
    return this.leadsService.receiveWhatsAppWebhook(payload, {
      integrationToken: token,
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? undefined,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.MARKETING)
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leadsService.findOne(user, id);
  }
}
