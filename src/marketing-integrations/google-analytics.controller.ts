import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../modules/auth/decorators/current-user.decorator';
import { Roles } from '../modules/auth/decorators/roles.decorator';
import { UserRole } from '../modules/auth/enums/user-role.enum';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import type { AuthUser } from '../modules/auth/types/auth-user.type';
import { SelectPropertyDto } from './dto/select-property.dto';
import { GoogleAnalyticsService } from './google-analytics.service';
import { GoogleAnalyticsProvider } from './providers/google-analytics.provider';

const cookieName = 'marketing_google_oauth';

@ApiTags('Google Analytics')
@Controller('marketing-integrations')
export class GoogleAnalyticsController {
  constructor(
    private readonly analytics: GoogleAnalyticsService,
    private readonly google: GoogleAnalyticsProvider,
  ) {}

  private cookieOptions() {
    const redirect = new URL(this.google.settings().redirectUri);
    return {
      httpOnly: true,
      secure: redirect.protocol === 'https:',
      sameSite: 'lax' as const,
      path: redirect.pathname.replace(/\/callback$/, ''),
    };
  }

  @Get('google/connect')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  connect(@CurrentUser() user: AuthUser) {
    return this.analytics.connect(user.sub);
  }

  @Get('google/authorize')
  async authorize(@Query('ticket') ticket: string, @Res() response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    if (typeof ticket !== 'string' || !/^[\w-]{43}$/.test(ticket))
      throw new BadRequestException('Autorização inválida.');
    const result = await this.analytics.authorize(ticket);
    response.cookie(cookieName, result.browser, {
      ...this.cookieOptions(),
      maxAge: 10 * 60000,
    });
    return response.redirect(result.url);
  }

  @Get('google/callback')
  async callback(
    @Query('state') state: string,
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    const browser =
      request.headers.cookie
        ?.split(';')
        .map((value) => value.trim())
        .find((value) => value.startsWith(`${cookieName}=`))
        ?.slice(cookieName.length + 1) ?? '';
    let outcome: 'selecione' | 'erro' | 'cancelado' = 'erro';
    try {
      if (
        typeof state !== 'string' ||
        !/^[\w-]{43}$/.test(state) ||
        (code !== undefined && typeof code !== 'string') ||
        (error !== undefined && typeof error !== 'string')
      )
        throw new BadRequestException();
      outcome = await this.analytics.callback(state, browser, code, error);
    } catch {
      /* Nunca redirecionar códigos, tokens ou detalhes do Google ao frontend. */
    }
    response.clearCookie(cookieName, this.cookieOptions());
    return response.redirect(this.analytics.frontendRedirect(outcome));
  }

  @Get('google-analytics/properties')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  properties(@CurrentUser() user: AuthUser) {
    return this.analytics.properties(user.sub);
  }

  @Post('google-analytics/select-property')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  select(@CurrentUser() user: AuthUser, @Body() dto: SelectPropertyDto) {
    return this.analytics.selectProperty(user.sub, dto.propertyId);
  }

  @Post('google-analytics/test')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  test() {
    return this.analytics.test();
  }

  @Delete('google-analytics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  disconnect() {
    return this.analytics.disconnect();
  }
}
